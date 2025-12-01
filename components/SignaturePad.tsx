import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  label: string;
  onSave: (data: string) => void;
  isRTL: boolean;
  typedName?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, isRTL, typedName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = 128; // Matches h-32
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#004A99';
      }
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    const pos = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    const pos = getPos(e);
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
        setIsDrawing(false);
        onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSave('');
    }
  };

  return (
    <div className="border border-gray-300 rounded p-2 bg-white shadow-sm print:border-none print:shadow-none">
      <p className={`text-xs font-bold text-jesa-grey mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{label}</p>
      <div className="relative border-b-2 border-dashed border-gray-300 bg-gray-50 h-32 rounded-lg overflow-hidden">
        
        {/* Real-time Typed Name Visualization */}
        {!hasSignature && typedName && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                <span className="text-4xl text-jesa-blue/90 transform -rotate-2" style={{ fontFamily: "'Great Vibes', cursive" }}>
                    {typedName}
                </span>
            </div>
        )}

        {/* Placeholder Text */}
        {!hasSignature && !typedName && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-sm z-0">
                {isRTL ? 'وقع هنا' : 'Sign Here'}
            </div>
        )}
        
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-10 bg-transparent"
        />
      </div>
      <div className="flex justify-between mt-1 print:hidden">
        <button onClick={clear} className="text-xs text-red-500 hover:text-red-700">
             {isRTL ? 'مسح' : 'Clear'}
        </button>
        <span className="text-[10px] text-gray-400">Digital ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
      </div>
    </div>
  );
};

export default SignaturePad;