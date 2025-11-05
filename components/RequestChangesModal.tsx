
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface RequestChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RequestChangesModal: React.FC<RequestChangesModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start space-x-4">
          <div className="bg-amber-100 p-3 rounded-full flex-none">
            <AlertTriangle className="text-amber-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Changes?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              By requesting changes, you are indicating that the current version requires revisions.
              The design team will be notified and a new version cycle will begin.
              You can expect to receive a new version as soon as possible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestChangesModal;
