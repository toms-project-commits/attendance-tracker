'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ProofCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  subjectName?: string;
}

interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

export default function ProofCapture({ onCapture, onCancel, subjectName }: ProofCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watermarkedFileRef = useRef<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Request geolocation
  const getGeolocation = useCallback((): Promise<GeolocationCoords> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location permissions in your device settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable. Please check your GPS settings.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out. Please try again.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Watermark the image with GPS and timestamp
  const watermarkImage = useCallback(async (imageFile: File, coords: GeolocationCoords): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          try {
            const canvas = canvasRef.current;
            if (!canvas) {
              reject(new Error('Canvas not available'));
              return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }

            // Set canvas size to match image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Prepare watermark data
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }).replace(/\//g, '-');
            const timeStr = now.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            const timestamp = `${dateStr} | ${timeStr}`;
            const location = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;

            // Calculate watermark dimensions
            const footerHeight = Math.max(img.height * 0.15, 100);
            const padding = 20;
            const lineHeight = 30;

            // Draw semi-transparent footer
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, img.height - footerHeight, img.width, footerHeight);

            // Draw border on top of footer
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, img.height - footerHeight, img.width, footerHeight);

            // Set text properties
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // BunkSafe Verified Proof - Title
            ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
            ctx.fillText(
              'BUNKSAFE VERIFIED PROOF',
              padding,
              img.height - footerHeight + padding
            );

            // Timestamp
            ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#fbbf24'; // Yellow
            ctx.fillText(
              `TIME: ${timestamp}`,
              padding,
              img.height - footerHeight + padding + lineHeight + 5
            );

            // GPS Coordinates
            ctx.fillStyle = '#34d399'; // Green
            ctx.fillText(
              `GPS: ${location}`,
              padding,
              img.height - footerHeight + padding + (lineHeight * 2) + 10
            );

            // Subject name (if provided)
            if (subjectName) {
              ctx.fillStyle = '#60a5fa'; // Blue
              ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
              ctx.fillText(
                `SUBJECT: ${subjectName}`,
                padding,
                img.height - footerHeight + padding + (lineHeight * 3) + 10
              );
            }

            // Convert canvas to WebP blob
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const watermarkedFile = new File(
                    [blob],
                    `proof_${Date.now()}.webp`,
                    { type: 'image/webp' }
                  );
                  resolve(watermarkedFile);
                } else {
                  reject(new Error('Failed to create watermarked image'));
                }
              },
              'image/webp',
              0.9
            );
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };

      reader.readAsDataURL(imageFile);
    });
  }, [subjectName]);

  // Handle file selection from camera
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturing(true);
    setError(null);
    setProcessingImage(true);

    try {
      // Get GPS coordinates
      const coords = await getGeolocation();

      // Watermark the image
      const watermarkedFile = await watermarkImage(file, coords);

      // Create preview
      const previewUrl = URL.createObjectURL(watermarkedFile);
      setPreview(previewUrl);

      // Store file for confirmation
      watermarkedFileRef.current = watermarkedFile;

      setProcessingImage(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      setCapturing(false);
      setProcessingImage(false);
    }
  }, [getGeolocation, watermarkImage]);

  // Trigger camera
  const triggerCamera = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  // Confirm and use captured image
  const confirmCapture = useCallback(() => {
    const watermarkedFile = watermarkedFileRef.current;
    if (watermarkedFile) {
      onCapture(watermarkedFile);
    }
  }, [onCapture]);

  // Retake photo
  const retake = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setCapturing(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    watermarkedFileRef.current = null;
  }, [preview]);

  // Cancel and close
  const handleCancel = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    onCancel();
  }, [preview, onCancel]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="border-[3px] border-white bg-slate-900 w-full max-w-2xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b-[3px] border-white p-4 flex items-center justify-between bg-blue-500">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Camera size={24} />
            Capture Proof of Attendance
          </h3>
          <button
            onClick={handleCancel}
            className="p-2 border-[2px] border-white bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Message */}
          {!capturing && !preview && (
            <div className="border-[3px] border-yellow-400 bg-yellow-400/10 p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="text-yellow-400 shrink-0" size={24} />
                <div>
                  <p className="font-bold text-white text-sm mb-2">
                    GPS-Verified Proof Requirements:
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 font-semibold">
                    <li>• Camera access required (photos only, no gallery)</li>
                    <li>• GPS location access required</li>
                    <li>• Timestamp and location will be watermarked on image</li>
                    <li>• Image cannot be edited after capture</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="border-[3px] border-red-500 bg-red-500/10 p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={24} />
                <div>
                  <p className="font-bold text-red-500 text-sm mb-1">Error</p>
                  <p className="text-sm text-gray-300 font-semibold">{error}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-2">
                    Please check your device settings and try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {processingImage && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
              <p className="font-black text-white text-lg">Processing Image...</p>
              <p className="text-sm text-gray-400 font-semibold mt-2">
                Adding GPS watermark and verifying location
              </p>
            </div>
          )}

          {/* Preview */}
          {preview && !processingImage && (
            <div className="space-y-4">
              <div className="border-[3px] border-white bg-black p-2">
                <img
                  src={preview}
                  alt="Proof preview"
                  className="w-full h-auto"
                />
              </div>
              <div className="border-[3px] border-green-500 bg-green-500/10 p-4">
                <p className="text-sm text-green-400 font-bold flex items-center gap-2">
                  <Check size={18} />
                  Proof successfully watermarked with GPS and timestamp
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {!preview ? (
              <>
                <button
                  onClick={handleCancel}
                  className={clsx(
                    "flex-1 py-3 px-4 font-black text-base",
                    "border-[3px] border-white bg-gray-600 text-white",
                    "shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
                    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "transition-all duration-150"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={triggerCamera}
                  disabled={processingImage}
                  className={clsx(
                    "flex-1 py-3 px-4 font-black text-base text-white flex items-center justify-center gap-2",
                    "border-[3px] border-white bg-blue-500",
                    "shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
                    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "transition-all duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Camera size={20} />
                  Open Camera
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={retake}
                  className={clsx(
                    "flex-1 py-3 px-4 font-black text-base",
                    "border-[3px] border-white bg-orange-500 text-white",
                    "shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
                    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "transition-all duration-150"
                  )}
                >
                  Retake Photo
                </button>
                <button
                  onClick={confirmCapture}
                  className={clsx(
                    "flex-1 py-3 px-4 font-black text-base text-white flex items-center justify-center gap-2",
                    "border-[3px] border-white bg-green-500",
                    "shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
                    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "transition-all duration-150"
                  )}
                >
                  <Check size={20} />
                  Use This Proof
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input with camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
