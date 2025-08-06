import { Dialog } from '@headlessui/react'
import { Fragment, useState } from 'react'
import MyMap from './MyMap'




function MapModal({ isOpen, setIsOpen, exactLocation }: { 
  isOpen: boolean, 
  setIsOpen: (open: boolean) => void, 
  exactLocation: string | null 
}) {
  
  return (
    <Dialog as="div" className="relative z-50" open={isOpen} onClose={() => setIsOpen(false)}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-[60vw]  rounded bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold mb-4">Waste Location</Dialog.Title>
          {exactLocation ? (
            <MyMap exactLocation={exactLocation} />
          ) : (
            <p>No location provided.</p>
          )}
          <div className="mt-4 text-right">
            <button
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default MapModal