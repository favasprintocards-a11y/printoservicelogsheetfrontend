import React, { useState, useRef, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import API from '../utils/api';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Edit2, QrCode, X } from 'lucide-react';
// html5-qrcode is loaded dynamically only when scanning is triggered
import printoLogo from '../assets/printo-logo.jpg';

/**
 * SigPad — a SignatureCanvas wrapper that keeps the canvas pixel dimensions
 * perfectly in sync with its container via ResizeObserver.
 * Without this, using `w-full h-full` CSS causes a coordinate mismatch that
 * makes strokes appear shifted/in wrong positions.
 */
const SigPad = React.forwardRef(({ onEnd }, ref) => {
    const wrapperRef = useRef(null);
    const sigRef = useRef(null);
    const isRestoringRef = useRef(false); // prevents re-entrant syncSize during fromDataURL

    // Expose the inner SignatureCanvas instance via the forwarded ref
    React.useImperativeHandle(ref, () => sigRef.current, []);

    const syncSize = useCallback(() => {
        if (!sigRef.current || !wrapperRef.current) return;
        // Block re-entrant calls (fromDataURL can briefly trigger ResizeObserver)
        if (isRestoringRef.current) return;

        const canvas = sigRef.current.getCanvas();
        const { offsetWidth: w, offsetHeight: h } = wrapperRef.current;
        if (!w || !h) return;

        // Skip if pixel dimensions already match — nothing to do
        if (canvas.width === w && canvas.height === h) return;

        // Save current drawing BEFORE resizing (resizing clears the canvas)
        let dataURL = null;
        try {
            if (!sigRef.current.isEmpty()) {
                dataURL = sigRef.current.toDataURL();
            }
        } catch (_) { /* ignore */ }

        // Resize: set pixel dimensions to match the CSS-rendered container size
        canvas.width = w;
        canvas.height = h;

        // Restore drawing — call WITHOUT width/height options so the image
        // is drawn at 1:1 on the already-correctly-sized canvas (no scaling)
        if (dataURL) {
            isRestoringRef.current = true;
            sigRef.current.fromDataURL(dataURL);
            // Clear the guard after the async image load completes (~150ms)
            setTimeout(() => { isRestoringRef.current = false; }, 150);
        }
    }, []);

    useEffect(() => {
        if (!wrapperRef.current) return;
        // Initial sync after mount
        syncSize();
        // Watch for container size changes (e.g. window resize, layout shift)
        const ro = new ResizeObserver(syncSize);
        ro.observe(wrapperRef.current);
        return () => ro.disconnect();
    }, [syncSize]);

    return (
        <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
            <SignatureCanvas
                ref={sigRef}
                canvasProps={{ style: { width: '100%', height: '100%', cursor: 'crosshair', display: 'block' } }}
                onEnd={onEnd}
            />
        </div>
    );
});
SigPad.displayName = 'SigPad';

const ServiceLogForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        ticketNumber: '',
        requestDate: new Date().toISOString().split('T')[0],
        basicDetails: {
            ticketId: '',
            customerName: '',
            serviceLocation: '',
            productName: '',
            productSerial: '',
            problemDescription: ''
        },
        supportDetails: {
            requestType: [],
            requestMode: '',
            receivedBy: '',
            customerContact: '',
            resellerName: ''
        },
        sparesDetails: {
            replacedSpare: '',
            replacedSpareSlNo: '',
            damagedOldSpare: '',
            damagedOldSpareSlNo: '',
            testCardAttached: false,
            printingCounter: '',
            serviceCharge: 0,
            anyOtherCharges: 0,
            chargeDescription: ''
        },
        briefDescription: '',
        engineerFeedback: {
            engineerName: '',
            timeSpent: '',
            status: 'Pending',
            engineerSignature: ''
        },
        customerFeedback: {
            rating: '',
            representativeName: '',
            signature: '',
            contactNo: '',
            email: '',
            remarks: ''
        }
    });
    const [isScanning, setIsScanning] = useState(false);
    const [sigReady, setSigReady] = useState(false);

    const engineerSigRef = useRef(null);
    const customerSigRef = useRef(null);
    const componentRef = useRef();

    useEffect(() => {
        if (id) {
            setLoading(true);
            API.get(`/service-logs/${id}`)
                .then(({ data }) => {
                    const formattedDate = data.requestDate ? new Date(data.requestDate).toISOString().split('T')[0] : '';
                    setFormData({
                        ...data,
                        requestDate: formattedDate,
                        basicDetails: data.basicDetails || {},
                        supportDetails: data.supportDetails || {},
                        sparesDetails: data.sparesDetails || {},
                        engineerFeedback: data.engineerFeedback || {},
                        customerFeedback: data.customerFeedback || {}
                    });
                    // Wait for canvas to mount and have proper dimensions before loading image
                    setTimeout(() => {
                        setSigReady(true);
                    }, 300);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    alert("Failed to load log");
                    setLoading(false);
                });
        } else {
            // Fetch next ticket number for new log
            API.get('/service-logs/next-number')
                .then(({ data }) => {
                    setFormData(prev => ({ ...prev, ticketNumber: data.nextNumber }));
                })
                .catch(err => console.error("Error fetching next ticket number:", err));
        }
    }, [id]);

    useEffect(() => {
        if (formData.ticketNumber) {
            document.title = `${formData.ticketNumber} - Service Log`;
        }
        return () => { document.title = 'Printocards Service Generator'; };
    }, [formData.ticketNumber]);

    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const handleBasicChange = (field, value) => handleInputChange('basicDetails', field, value);

    const handleCheckboxChange = (field, value) => {
        setFormData(prev => {
            const current = prev.supportDetails[field] || [];
            const updated = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
            return {
                ...prev,
                supportDetails: { ...prev.supportDetails, [field]: updated }
            };
        });
    };

    const calculateTotal = () => {
        return (Number(formData.sparesDetails?.serviceCharge) || 0) + (Number(formData.sparesDetails?.anyOtherCharges) || 0);
    };

    const clearEngineerSig = () => {
        if (engineerSigRef.current) engineerSigRef.current.clear();
    };
    const clearCustomerSig = () => {
        if (customerSigRef.current) customerSigRef.current.clear();
    };

    const saveSignature = (ref, section, field) => {
        if (ref.current && !ref.current.isEmpty()) {
            handleInputChange(section, field, ref.current.toDataURL());
        }
    };

    // When sigReady flips to true, load saved images into the already-mounted canvases
    useEffect(() => {
        if (!sigReady) return;
        const loadSig = (ref, dataURL) => {
            if (!ref.current || !dataURL) return;
            const canvas = ref.current.getCanvas();
            ref.current.fromDataURL(dataURL, { width: canvas.width, height: canvas.height });
        };
        loadSig(engineerSigRef, formData.engineerFeedback?.engineerSignature);
        loadSig(customerSigRef, formData.customerFeedback?.signature);
    }, [sigReady]);

    // Callback refs — store instance and (if editing) load saved signature
    const onEngineerSigMount = (ref) => {
        if (!ref) return;
        engineerSigRef.current = ref;
    };

    const onCustomerSigMount = (ref) => {
        if (!ref) return;
        customerSigRef.current = ref;
    };

    useEffect(() => {
        let scnr = null;
        if (isScanning) {
            const timer = setTimeout(async () => {
                try {
                    // Dynamically import the heavy library only when actually scanning
                    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
                    scnr = new Html5Qrcode("reader", {
                        formatsToSupport: [
                            Html5QrcodeSupportedFormats.QR_CODE,
                            Html5QrcodeSupportedFormats.CODE_128,
                            Html5QrcodeSupportedFormats.CODE_39,
                            Html5QrcodeSupportedFormats.CODE_93,
                            Html5QrcodeSupportedFormats.EAN_13,
                            Html5QrcodeSupportedFormats.EAN_8,
                            Html5QrcodeSupportedFormats.UPC_A,
                            Html5QrcodeSupportedFormats.UPC_E,
                            Html5QrcodeSupportedFormats.ITF,
                            Html5QrcodeSupportedFormats.DATA_MATRIX,
                            Html5QrcodeSupportedFormats.PDF_417
                        ],
                        verbose: false
                    });
                    await scnr.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 280, height: 120 },
                            aspectRatio: 1.7
                        },
                        (text) => {
                            handleBasicChange('productSerial', text);
                            setIsScanning(false);
                        },
                        () => { } // Silent error
                    );
                } catch (err) {
                    console.error(err);
                    setIsScanning(false);
                }
            }, 300);

            return () => {
                clearTimeout(timer);
                if (scnr && scnr.isScanning) {
                    scnr.stop().then(() => scnr.clear()).catch(() => { });
                }
            };
        }
    }, [isScanning]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Ensure latest signatures are captured before submission
        if (engineerSigRef.current && !engineerSigRef.current.isEmpty()) {
            formData.engineerFeedback.engineerSignature = engineerSigRef.current.toDataURL();
        }
        if (customerSigRef.current && !customerSigRef.current.isEmpty()) {
            formData.customerFeedback.signature = customerSigRef.current.toDataURL();
        }

        try {
            if (id) {
                await API.put(`/service-logs/${id}`, formData);
                alert('Service Log Updated Successfully!');
            } else {
                const { data } = await API.post('/service-logs', formData);
                alert(`Service Log Created Successfully! Ticket #${data.ticketNumber}`);
                navigate(`/edit/${data._id}`, { replace: true });
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save log.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 p-2 md:p-8 print:p-0 flex flex-col items-center font-sans">

            {/* Modern Header / Toolbar (Hidden in Print) */}
            <div className="w-full max-w-[220mm] mb-6 print:hidden flex flex-col md:flex-row justify-between items-center gap-4">
                <Link to="/" className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Dashboard</span>
                </Link>

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all active:scale-95 shadow-lg shadow-primary/20 mr-2">
                        <Save size={18} />
                        {id ? "Update Log" : "Save Log"}
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-medium transition-all">
                        <Printer size={18} />
                        Print / PDF
                    </button>
                </div>
            </div>

            {/* Status indicator for Edit Mode */}
            {id && (
                <div className="print:hidden w-full max-w-[210mm] mb-2 flex justify-end">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <Edit2 size={12} /> Editing Ticket #{formData.ticketNumber}
                    </span>
                </div>
            )}

            {/* A4 Container - Strict Height for Desktop/Print */}
            {/* We add a subtle ring/shadow for desktop to make it look like paper on a desk */}
            <div className="w-full md:w-[210mm] print:w-[210mm] md:h-[297mm] print:h-[297mm] h-auto bg-white text-black leading-tight shadow-xl ring-1 ring-black/5 print:shadow-none print:ring-0 relative overflow-hidden transition-all duration-500 ease-in-out" ref={componentRef}>

                {/* Main Content Border - Fills Full Height minus Margins */}
                <div className="border-[2px] border-black m-2 md:m-8 print:m-8 flex flex-col box-border md:h-[calc(100%-4rem)] print:h-[calc(100%-4rem)]">

                    {/* HEADER */}
                    <div className="flex flex-col md:flex-row print:flex-row border-b-[2px] border-black h-auto md:h-24 print:h-24 print:flex-nowrap shrink-0">
                        <div className="w-full md:w-1/3 print:w-1/3 p-2 border-b md:border-b-0 md:border-r print:border-r border-black flex items-center justify-center text-center font-bold text-lg">
                            PRINTO CARDS & TECHNOLOGIES
                        </div>
                        <div className="w-full md:w-1/3 print:w-1/3 p-2 border-b md:border-b-0 md:border-r print:border-r border-black flex items-center justify-center">
                            <img src={printoLogo} alt="Printo Logo" className="h-20 object-contain" />
                        </div>
                        <div className="w-full md:w-1/3 print:w-1/3 p-2 flex flex-col justify-between">
                            <div className="font-bold text-lg text-center uppercase border-b border-black pb-1">Service Log Sheet</div>
                            <div className="flex justify-between mt-1">
                                <span>No:</span><span className="text-red-600 font-bold">{formData.ticketNumber || 'Loading...'}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span>Date:</span><input type="date" value={formData.requestDate} onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })} className="border-b border-gray-400 w-32 text-right focus:outline-none focus:border-primary transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 1: BASIC DETAILS */}
                    <div className="border-b-[2px] border-black shrink-0">
                        <div className="flex flex-col md:flex-row print:flex-row border-b border-black print:flex-nowrap">
                            <div className="w-full md:w-[15%] print:w-[15%] p-1 border-b md:border-b-0 md:border-r print:border-r border-black font-semibold bg-gray-50/50 print:bg-gray-50 text-[15px]">Customer Details</div>
                            <div className="w-full md:flex-1 print:flex-1 p-1 border-b md:border-b-0 md:border-r print:border-r border-black">
                                <input type="text" value={formData.basicDetails?.ticketId} onChange={(e) => handleBasicChange('ticketId', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                            </div>
                            <div className="w-full md:w-[15%] print:w-[15%] p-1 border-b md:border-b-0 md:border-r print:border-r border-black font-semibold bg-gray-50/50 print:bg-gray-50">Customer Name</div>
                            <div className="w-full md:flex-1 print:flex-1 p-1">
                                <input type="text" value={formData.basicDetails?.customerName} onChange={(e) => handleBasicChange('customerName', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row print:flex-row border-b border-black print:flex-nowrap">
                            <div className="w-full md:w-[15%] print:w-[15%] p-1 border-b md:border-b-0 md:border-r print:border-r border-black font-semibold bg-gray-50/50 print:bg-gray-50">Service Location</div>
                            <div className="w-full md:flex-1 print:flex-1 p-1">
                                <input type="text" value={formData.basicDetails?.serviceLocation} onChange={(e) => handleBasicChange('serviceLocation', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row print:flex-row print:flex-nowrap">
                            <div className="w-full md:w-[15%] print:w-[15%] p-1 border-b md:border-b-0 md:border-r print:border-r border-black font-semibold bg-gray-50/50 print:bg-gray-50">Product Name</div>
                            <div className="w-full md:flex-1 print:flex-1 p-1 border-b md:border-b-0 md:border-r print:border-r border-black">
                                <input type="text" value={formData.basicDetails?.productName} onChange={(e) => handleBasicChange('productName', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                            </div>
                            <div className="w-full md:w-[15%] print:w-[15%] p-1 border-b md:border-b-0 md:border-r print:border-r border-black font-semibold bg-gray-50/50 print:bg-gray-50 flex items-center justify-between">
                                <span>Serial Number</span>
                                <button type="button" onClick={() => setIsScanning(true)} className="print:hidden p-1 text-primary hover:bg-primary/10 rounded transition-colors" title="Scan QR Code / Barcode">
                                    <QrCode size={16} />
                                </button>
                            </div>
                            <div className="w-full md:flex-1 print:flex-1 p-1 relative">
                                <input type="text" value={formData.basicDetails?.productSerial} onChange={(e) => handleBasicChange('productSerial', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                                {isScanning && (
                                    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4">
                                        <div className="bg-white rounded-2xl p-4 w-full max-w-md relative">
                                            <button onClick={() => setIsScanning(false)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors">
                                                <X size={32} />
                                            </button>
                                            <div className="mb-4 text-center">
                                                <h3 className="text-lg font-bold">Scan Serial Number</h3>
                                                <p className="text-sm text-slate-500">Point camera at a <strong>QR code</strong> or <strong>barcode</strong></p>
                                            </div>
                                            <div id="reader" className="overflow-hidden rounded-xl border-2 border-slate-100"></div>
                                            <p className="text-xs text-center text-slate-400 mt-2">Supports QR · Code128 · Code39 · EAN-13 · EAN-8 · UPC · ITF · PDF417</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SUPPORT REQUEST DETAILS */}
                    <div className="border-b-[2px] border-black shrink-0">
                        <div className="bg-gray-100 font-bold text-center border-b border-black py-1 tracking-wide text-sm">SUPPORT REQUEST DETAILS</div>
                        <div className="flex flex-wrap p-1">
                            <span className="font-semibold mr-4 w-full md:w-auto print:w-auto mb-1 md:mb-0">Request Type:</span>
                            {['Demo', 'Installation & Training', 'Warranty', 'Own Printer', 'Chargeable'].map((type) => (
                                <label key={type} className="flex items-center mr-4 cursor-pointer text-sm mb-1 hover:text-primary transition-colors">
                                    <input type="checkbox" checked={(formData.supportDetails?.requestType || []).includes(type)} onChange={() => handleCheckboxChange('requestType', type)} className="mr-1 accent-black" />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 3: BRIEF DESCRIPTION - FLEX GROW to fill space */}
                    <div className="border-b-[2px] border-black flex-grow flex flex-col min-h-[50px]">
                        <div className="bg-gray-100 font-bold border-b border-black px-2 py-1 shrink-0 tracking-wide text-sm">BRIEF DESCRIPTION OF SERVICE REQUEST / PROBLEM REPORTED</div>
                        <textarea className="w-full flex-grow p-2 resize-none h-full focus:bg-primary/10 transition-colors" value={formData.briefDescription} onChange={(e) => setFormData({ ...formData, briefDescription: e.target.value })}></textarea>
                    </div>

                    {/* SECTION 4: SPARES & SERVICE CHARGES */}
                    <div className="border-b-[2px] border-black shrink-0">
                        <div className="bg-gray-100 font-bold text-center border-b border-black py-1 tracking-wide text-sm">SPARES & SERVICE CHARGES</div>

                        <div className="flex flex-col md:flex-row print:flex-row border-b border-black print:flex-nowrap">
                            <div className="w-full md:w-[15%] print:w-[15%] p-5 border-b md:border-b-0 md:border-r print:border-r border-black font-semibold bg-gray-50/50 print:bg-gray-50 flex items-center justify-center text-center text-[15px] whitespace-pre-wrap">Charges Description</div>
                            <div className="w-full md:flex-1 print:flex-1 p-1">
                                <input type="text" placeholder="Description of service/spares charges..." value={formData.sparesDetails?.chargeDescription} onChange={(e) => handleInputChange('sparesDetails', 'chargeDescription', e.target.value)} className="w-full focus:bg-primary/10 transition-colors h-full" />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row print:flex-row border-black print:flex-nowrap">
                            <div className="w-full md:w-1/3 print:w-1/3 p-1 border-b md:border-b-0 md:border-r print:border-r border-black flex justify-between items-center h-10 md:h-auto">
                                <span className="font-semibold">Service Charge:</span>
                                <input type="number" className="w-24 text-right font-mono border-b border-gray-300 focus:border-black" value={formData.sparesDetails?.serviceCharge} onChange={(e) => handleInputChange('sparesDetails', 'serviceCharge', e.target.value)} />
                            </div>
                            <div className="w-full md:w-1/3 print:w-1/3 p-1 border-b md:border-b-0 md:border-r print:border-r border-black flex justify-between items-center h-10 md:h-auto">
                                <span className="font-semibold">Other Charges:</span>
                                <input type="number" className="w-24 text-right font-mono border-b border-gray-300 focus:border-black" value={formData.sparesDetails?.anyOtherCharges} onChange={(e) => handleInputChange('sparesDetails', 'anyOtherCharges', e.target.value)} />
                            </div>
                            <div className="w-full md:w-1/3 print:w-1/3 p-1 flex justify-between items-center font-bold bg-gray-100 md:bg-gray-50 print:bg-gray-50 h-10 md:h-auto">
                                <span>Total Call Cost:</span>
                                <span className="font-mono text-lg">{calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: FEEDBACK & SIGNATURES - Fixed Height for Footer */}
                    <div className="flex flex-col md:flex-row print:flex-row border-t border-black md:h-64 print:h-64 print:flex-nowrap shrink-0">
                        <div className="w-full md:w-1/2 print:w-1/2 border-b md:border-b-0 md:border-r print:border-r border-black flex flex-col">
                            <div className="bg-gray-100 font-bold border-b border-black px-2 py-1 text-center shrink-0 tracking-wide text-sm">PRINTO ENGINEER FEEDBACK</div>
                            <div className="flex flex-row border-b border-black print:flex-nowrap shrink-0">
                                <div className="w-1/2 p-1 border-r border-black">
                                    <div className="text-xs text-gray-500">Engineer Name</div>
                                    <input type="text" value={formData.engineerFeedback?.engineerName} onChange={(e) => handleInputChange('engineerFeedback', 'engineerName', e.target.value)} />
                                </div>
                                <div className="w-1/2 p-1">
                                    <div className="text-xs text-gray-500">Time Spent</div>
                                    <input type="text" value={formData.engineerFeedback?.timeSpent} onChange={(e) => handleInputChange('engineerFeedback', 'timeSpent', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex border-b border-black p-1 items-center justify-between bg-gray-50 shrink-0">
                                <span className="font-semibold">Current Status:</span>
                                <select className="border-b border-gray-400 bg-transparent focus:outline-none cursor-pointer" value={formData.engineerFeedback?.status} onChange={(e) => handleInputChange('engineerFeedback', 'status', e.target.value)}>
                                    <option value="Pending">Pending</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                            <div className="flex-grow flex flex-col relative md:h-auto min-h-[80px]">
                                <div className="text-xs text-slate-400 p-1 absolute top-0 left-0 z-10 pointer-events-none">Sign Here</div>
                                <SigPad
                                    ref={onEngineerSigMount}
                                    onEnd={() => saveSignature(engineerSigRef, 'engineerFeedback', 'engineerSignature')}
                                />
                                <button onClick={clearEngineerSig} className="absolute top-1 right-1 text-[10px] text-red-500 hover:bg-red-50 bg-white border border-red-200 px-2 py-0.5 rounded print:hidden z-20 transition-colors">Clear</button>
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 print:w-1/2 flex flex-col">
                            <div className="bg-gray-100 font-bold border-b border-black px-2 py-1 text-center shrink-0 tracking-wide text-sm">CUSTOMER FEEDBACK</div>
                            <div className="flex border-b border-black p-1 justify-center space-x-4 shrink-0">
                                {['Poor', 'Average', 'Good', 'Excellent'].map(rating => (
                                    <label key={rating} className="flex items-center text-xs cursor-pointer hover:text-primary">
                                        <input type="radio" name="rating" value={rating} checked={formData.customerFeedback?.rating === rating} onChange={(e) => handleInputChange('customerFeedback', 'rating', e.target.value)} className="mr-1 accent-black" />
                                        {rating}
                                    </label>
                                ))}
                            </div>
                            <div className="flex-grow flex flex-col relative border-b border-black md:h-auto min-h-[80px]">
                                <div className="text-xs text-slate-400 p-1 absolute top-0 left-0 z-10 pointer-events-none">Sign Here (with Seal)</div>
                                <SigPad
                                    ref={onCustomerSigMount}
                                    onEnd={() => saveSignature(customerSigRef, 'customerFeedback', 'signature')}
                                />
                                <button onClick={clearCustomerSig} className="absolute top-1 right-1 text-[10px] text-red-500 hover:bg-red-50 bg-white border border-red-200 px-2 py-0.5 rounded print:hidden z-20 transition-colors">Clear</button>
                            </div>
                            <div className="flex flex-row border-b border-black print:flex-nowrap shrink-0">
                                <div className="w-1/2 md:flex-1 p-1 border-r border-black">
                                    <div className="text-xs text-gray-500">Rep. Name</div>
                                    <input type="text" value={formData.customerFeedback?.representativeName} onChange={(e) => handleInputChange('customerFeedback', 'representativeName', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                                </div>
                                <div className="w-1/2 md:flex-1 p-1">
                                    <div className="text-xs text-gray-500">Contact / Email</div>
                                    <input type="text" value={formData.customerFeedback?.contactNo} onChange={(e) => handleInputChange('customerFeedback', 'contactNo', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                                </div>
                            </div>
                            <div className="p-1 shrink-0">
                                <input type="text" placeholder="Customer Remarks..." value={formData.customerFeedback?.remarks} onChange={(e) => handleInputChange('customerFeedback', 'remarks', e.target.value)} className="w-full focus:bg-primary/10 transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ServiceLogForm;
