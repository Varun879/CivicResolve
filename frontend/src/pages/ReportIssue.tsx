import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createComplaint, analyzeImage } from '../api/complaints';
import { useAuth } from '../context/AuthContext';

export default function ReportIssue() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('POTHOLE');
  const [priority, setPriority] = useState('MEDIUM');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [image, setImage] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        (err) => console.warn('GPS capture failed', err)
      );
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        
        // Run AI Analysis immediately upon upload
        if (lat !== null && lng !== null) {
          setAiAnalyzing(true);
          try {
            const aiResult = await analyzeImage({
              category,
              description,
              latitude: lat,
              longitude: lng,
              imageBase64: base64
            });
            setCategory(aiResult.category);
            setPriority(aiResult.priority);
            if (aiResult.justification) {
              setJustification(aiResult.justification);
            }
          } catch (err) {
            console.warn('AI analysis failed', err);
          } finally {
            setAiAnalyzing(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (lat === null || lng === null) return alert('Waiting for GPS coordinates...');
    if (!image) return alert('Please upload an image first.');
    
    setSubmitting(true);
    setAiAnalyzing(true);
    try {
      await createComplaint({
        title: category, // Title was removed from the new UI, using category
        description,
        category: category,
        priority: priority,
        latitude: lat,
        longitude: lng,
        imageBase64: image
      });
      navigate('/citizen/dashboard');
    } catch (err) {
      alert('Failed to submit complaint');
    } finally {
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary mb-1">Report an Issue</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Help us keep our city clean and safe.</p>
          </div>
          <button onClick={() => navigate(-1)} className="text-primary font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-low px-4 py-2 rounded-lg transition-colors border border-outline-variant">
            <span className="material-symbols-outlined">close</span> Cancel
          </button>
        </div>

        {/* Step 1: Photo Upload */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-4 shadow-sm">
          <h2 className="font-headline-md text-headline-md text-primary mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">photo_camera</span> 1. Upload Photo
          </h2>
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors min-h-[200px] relative overflow-hidden group">
            {!image ? (
              <div className="flex flex-col items-center gap-3 relative w-full h-full">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-primary">Drag & drop or click to upload</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Supports JPG, PNG (Max 10MB)</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-surface-container-lowest flex flex-col items-center justify-center p-4">
                <div className="w-full h-40 bg-surface-container rounded-lg mb-4 overflow-hidden relative">
                  <img src={image} className="w-full h-full object-cover" alt="Preview" />
                  {aiAnalyzing && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-surface-container-lowest px-4 py-2 rounded-full font-label-sm text-label-sm text-primary flex items-center gap-2 shadow-md">
                        <span className="material-symbols-outlined animate-spin" style={{fontSize: "16px"}}>sync</span>
                        AI Analyzing Photo...
                      </div>
                    </div>
                  )}
                  {!aiAnalyzing && (
                    <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none">
                      <div className="bg-surface-container-lowest px-4 py-2 rounded-full font-label-sm text-label-sm text-secondary flex items-center gap-2 shadow-md">
                        <span className="material-symbols-outlined text-secondary" style={{fontSize: "16px"}}>check_circle</span>
                        Analysis Complete
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: AI Analysis Results */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bg-secondary h-full"></div>
          <h2 className="font-headline-md text-headline-md text-primary mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">auto_awesome</span> 2. Issue Details
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 italic">Provide initial details. Our AI will automatically verify and adjust the category/priority upon submission.</p>
          
          {justification && (
            <div className="mb-4 bg-tertiary-container/30 border border-tertiary/20 p-3 rounded-lg flex gap-3 items-start">
              <span className="material-symbols-outlined text-tertiary text-xl">info</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                <strong className="text-tertiary">AI Priority Justification:</strong> {justification}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Category</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant text-primary font-body-md rounded-lg py-2 pl-3 pr-10 focus:border-primary focus:outline-none appearance-none">
                  <option value="GARBAGE">Garbage</option>
                  <option value="ILLEGAL_DUMPING">Illegal Dumping</option>
                  <option value="POTHOLE">Pothole</option>
                  <option value="DAMAGED_ROAD">Damaged Road</option>
                  <option value="STREETLIGHT">Broken Streetlight</option>
                  <option value="WATER_LEAKAGE">Water Leakage</option>
                  <option value="SEWAGE_OVERFLOW">Sewage Overflow</option>
                  <option value="DRAINAGE_BLOCKAGE">Drainage Blockage</option>
                  <option value="FALLEN_TREE">Fallen Tree</option>
                  <option value="FOOTPATH_DAMAGE">Footpath Damage</option>
                  <option value="PUBLIC_PROPERTY_DAMAGE">Public Property Damage</option>
                  <option value="OTHER">Other</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Priority</label>
              <div className="flex gap-2">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                  <span 
                    key={p} 
                    onClick={() => setPriority(p)}
                    className={`px-3 py-2 rounded-lg font-body-sm text-body-sm flex-1 text-center cursor-pointer transition-all ${priority === p ? 'bg-primary/20 border border-primary text-primary font-bold shadow-xs' : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-primary/10 hover:border-primary/50 hover:text-primary font-medium'}`}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Location Detected</label>
            <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <span className="font-body-md text-body-md text-primary flex-1">
                {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Locating...'}
              </span>
              <button className="text-secondary font-label-sm text-label-sm hover:underline">Edit</button>
            </div>
          </div>
        </section>

        {/* Step 3: Description */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="font-headline-md text-headline-md text-primary mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">description</span> 3. Additional Notes
          </h2>
          <div className="relative">
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Description (Optional)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant text-primary font-body-md rounded-lg p-3 min-h-[100px] focus:border-primary focus:outline-none" 
              placeholder="Provide any additional details..."
            />
            <div className="absolute bottom-3 right-3">
              <button className="w-10 h-10 bg-surface-container-low hover:bg-surface-variant text-primary rounded-full flex items-center justify-center transition-colors border border-outline-variant group" title="Use Voice to Text">
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">mic</span>
              </button>
            </div>
          </div>
        </section>

        {/* Final Submit */}
        <div className="flex justify-end mb-8">
          <button onClick={handleSubmit} disabled={submitting || aiAnalyzing} className="bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md py-4 px-8 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg w-full md:w-auto justify-center disabled:opacity-50">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
            {submitting ? 'Submitting...' : 'Confirm & Report'}
          </button>
        </div>

      </div>
    </div>
  );
}
