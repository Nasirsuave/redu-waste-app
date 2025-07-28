'use client'


import { useState, useCallback, useEffect } from "react"
import { MapPin, Upload, CheckCircle, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleGenerativeAI } from '@google/generative-ai'
import { StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api'
import { Libraries } from "@react-google-maps/api"
import { useRouter } from "next/navigation"
import { toast } from 'react-hot-toast'
import { resolve } from "path"
import { createReport, getUserByEmail, getRecentReports, createUser } from "../../../../utils/db/action"
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react"



const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string
const googleApikey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string

const libraries: Libraries = ['places']


export default function ReportPage() {
  const { userInfo } = useWeb3AuthUser();

  const [user, setUser] = useState('') as any
  const router = useRouter()

  const [reports, setReports] = useState<
    Array<{
      id: number;
      location: string;
      wasteType: string;
      amount: string;
      createdAt: string;
    }> | []
  >([])

  const [newReport, setNewReport] = useState({
    location: '',
    type: '',
    amount: '',
  })

  const [file, setFile] = useState<File | null>(null)
  //so user will see the image they uploaded
  const [preview, setPreview] = useState<string | null>(null)

  //They represent the status of an image verification process — basically a progress tracker:
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "failure"
  >("idle")

  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
  } | null>(null)

  // tracks whether the user is currently submitting the form.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null)

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleApikey,
    libraries: libraries
  })

  //we made onLoad a useCallback to prevent the <StandaloneSearchBox /> component from google maps from re-initializing 
  const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref)
  }, [])

  //triggered when user selects one of the suggestion
  const onPlacesChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0]
        setNewReport(prev => ({
          ...prev,
          location: place.formatted_address || ''
        }))
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewReport({ ...newReport, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader(); //read content of file
      reader.onload = (e) => { //run when file reading is done
        setPreview(e.target?.result as string)
      };
      reader.readAsDataURL(selectedFile);
    }
  }


  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file)
    })
  }

  const handleVerify = async () => {
    if (!file) {
      toast.error('Please upload an image first')
      return
    }

    if (!userInfo?.email) {
      toast.error('Please login first')
      return
    }

    setVerificationStatus('verifying')

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type,
          }
        }
      ]

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
            1. The type of waste (e.g., plastic, paper, glass, metal, organic)
            2. An estimate of the quantity or amount (in kg or liters)
            3. Your confidence level in this assessment (as a percentage)


            Respond in JSON format like this:
            {
            "wasteType": "type of waste",
            "quantity": "estimated quantity with unit",
            "confidence": confidence level as a number between 0 and 1
             }
            
            Do not wrap the JSON response in any code block (no backticks), and do not include any explanation. `;

      const result = await model.generateContent([prompt, ...imageParts])
      const response = await result.response;
      const text = response.text(); //"{}"
      console.log("Raw Gemini response:", text)

      try {
        const parsedResult = JSON.parse(text); //{}
        if (parsedResult.wasteType && parsedResult.quantity && parsedResult.confidence) {
          setVerificationResult(parsedResult)
          setVerificationStatus('success')
          setNewReport({
            ...newReport,
            type: parsedResult.wasteType,
            amount: parsedResult.quantity
          })
          setUser(userInfo) //setting the user
          console.log("user: ", userInfo)

        } else {
          console.error('Invalid Verification result', parsedResult)
          setVerificationStatus('failure')
        }
      } catch (e) {
        console.error('Error parsing JSON response', e)
        setVerificationStatus('failure')
      }

    } catch (e) {
      console.error('Error verifying waste', e)
      setVerificationStatus('failure')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus !== 'success' || !user) {
      toast.error('Please verify the waste before submitting or log in')
      return
    }

    setIsSubmitting(true)

    try {
      if (!userInfo?.email) {
        toast.error('Please log in to submit a report')
        setIsSubmitting(false)
        return
      }

      const collector = await getUserByEmail(userInfo.email)
      if (!collector || !collector.id) {
        toast.error('User not found. Please try logging in again.')
        return
      }
      try {
        // console.log('Creating report with data:', {
        //   userId: collector.id,
        //   location: newReport.location,
        //   type: newReport.type,
        //   amount: newReport.amount,
        //   hasPreview: !!preview,
        //   hasVerification: !!verificationResult
        // });

        // Ensure all required fields are passed in the correct order
        // const report = await createReport(
        //   collector.id,
        //   newReport.location,
        //   newReport.type,
        //   newReport.amount,
        //   preview || undefined,
        //   verificationResult ? JSON.stringify(verificationResult) : undefined,

        // )

    //     console.log("details here: ",
    //       collector.id,
    //       newReport.location,
    //       newReport.type,
    //       newReport.amount,
    //       preview || undefined,
    //       verificationResult ? JSON.stringify(verificationResult) : undefined)
    //  ''
    console.log("creating report")
          const report = await createReport(
          collector.id,
          newReport.location,
          newReport.type,
          newReport.amount,
          preview || undefined,
          verificationResult ? JSON.stringify(verificationResult) : undefined
        );

        console.log("Report returns: ", report)

        const formattedReport = {
          id: report.id,
          location: report.location,
          wasteType: report.wasteType,
          amount: report.amount,
          createdAt: report.createdAt.toISOString().split('T')[0]
        };



        if (!report) {
          console.error('No report returned from createReport');
          throw new Error('Failed to create report - no response from server');
        }

        if (!report.id) {
          console.error('Invalid report returned:', report);
          throw new Error('Failed to create report - invalid response structure');
        }

        // const formattedReport = {
        //   id: report.id,
        //   location: report.location,
        //   wasteType: report.wasteType,
        //   amount: report.amount,
        //   createdAt: (report.createdAt || new Date()).toISOString().split('T')[0]
        // };

        setReports([formattedReport, ...reports])
        setNewReport({ location: '', type: '', amount: '' })
        setFile(null) //clearing for the next report
        setPreview(null) //clearing for the next report
        setVerificationResult(null) //clearing for the next report

        toast.success(`Report submitted successfully! You've earned points for reporting waste`)
      } catch (e) {
        console.error('Error submitting report:', e);
        if (e instanceof Error) {
          toast.error(`Failed to submit report: ${e.message}`);
        } else {
          toast.error('Failed to submit report. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }
       finally {
        setIsSubmitting(false);
       }
    } catch (e) {
      console.error('Error during report submission:', e);
      if (e instanceof Error) {
        toast.error(`Failed to submit report: ${e.message}`);
      } else {
        toast.error('Failed to submit report. Please try again.');
      }
      setIsSubmitting(false);
      return;
    }
  }



  useEffect(() => {
    const initializeUser = async () => {
      try {
        // First get recent reports
        const recentReports = await getRecentReports()
        const formattedReports = recentReports?.map((report: any) => ({
          ...report,
          createdAt: report.createdAt.toISOString().split('T')[0]
        })) || []
        setReports(formattedReports)

        // Then handle user creation/fetch
        if (userInfo?.email) {
          const existingUser = await getUserByEmail(userInfo.email)

          if (!existingUser) {
            // Create new user with proper object structure
            const newUser = await createUser(
              userInfo.email,
              userInfo.name || ''
            )
            setUser(newUser)
            toast.success('Account created successfully!')
          } else {
            setUser(existingUser)
            toast.success('Welcome back!')
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error)
        toast.error('Error setting up user account')
      }
    }

    if (userInfo) {
      initializeUser()
    }
  }, [userInfo])

  const { isConnected } = useWeb3AuthConnect()


  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }
  }, [isConnected])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to report waste</h1>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
            Log In
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        Report Waste
      </h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl mb-12">
        <div className="mb-8">
          <label htmlFor="waste-image" className="block text-lg font-medium text-gray-700 mb-2">
            Upload Waste Image
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 transition-colors duration-300">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="waste-image"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500"
                >
                  <span>Upload a file</span>
                  <input id="waste-image" name="waste-image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-4 mb-8">
            <img src={preview} alt="Waste preview" className="max-w-full h-auto rounded-xl shadow-md" />
          </div>
        )}

        <Button
          type="button"
          onClick={handleVerify}
          className="w-full mb-8 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-xl transition-colors duration-300"
          disabled={!file || verificationStatus === 'verifying'}
        >
          {verificationStatus === 'verifying' ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Verifying...
            </>
          ) : 'Verify Waste'}
        </Button>

        {verificationStatus === 'success' && verificationResult && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-xl">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-green-800">Verification Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Waste Type: {verificationResult.wasteType}</p>
                  <p>Quantity: {verificationResult.quantity}</p>
                  <p>Confidence: {(verificationResult.confidence * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            {isLoaded ? (
              <StandaloneSearchBox
                onLoad={onLoad}
                onPlacesChanged={onPlacesChanged}
              >
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={newReport.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                  placeholder="Enter waste location"
                />
              </StandaloneSearchBox>
            ) : (
              <input
                type="text"
                id="location"
                name="location"
                value={newReport.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                placeholder="Enter waste location"
              />
            )}
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
            <input
              type="text"
              id="type"
              name="type"
              value={newReport.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified waste type"
              readOnly
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Estimated Amount</label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={newReport.amount}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified amount"
              readOnly
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Submitting...
            </>
          ) : 'Submit Report'}
        </Button>

      </form>

      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Recent Reports</h2>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports?.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <MapPin className="inline-block w-4 h-4 mr-2 text-green-500" />
                    {report.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.wasteType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

