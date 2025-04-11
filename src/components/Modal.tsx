import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, onConfirm, confirmText = "Confirm" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center z-50 backdrop-blur-md">
      <div className="bg-secondary-base bg-opacity-90 rounded-lg shadow-xl overflow-hidden w-full max-w-sm">
        <div className="px-4 py-3 bg-secondary-base">
          <h3 className="text-lg font-medium text-primary">{title}</h3>
        </div>
        <div className="p-4 text-white">
          {children}
        </div>
        <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse bg-secondary-base">
          {onConfirm && (
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${
              confirmText === "Save" ? "primary cursor-pointer" : "bg-red-600 hover:bg-red-700 cursor-pointer"
              } text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center cursor-pointer rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-white hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
