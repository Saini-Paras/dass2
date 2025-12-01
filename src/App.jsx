import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Settings, 
  Upload, 
  FileJson, 
  Play, 
  Download, 
  Terminal,
  Database,
  Search,
  Menu,
  X,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  Link,
  Copy,
  ExternalLink,
  Globe,
  FileCode,
  Type
} from 'lucide-react';

// --- Utility: Script Loader & File Saver ---

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const saveAs = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-[#141414] border border-neutral-800 rounded-lg p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, title = "" }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700",
    danger: "bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40",
    ghost: "text-neutral-400 hover:text-white hover:bg-neutral-800"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      title={title}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", icon: Icon }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`bg-[#0a0a0a] border border-neutral-800 text-neutral-200 rounded-md py-2.5 text-sm focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-600 w-full ${Icon ? 'pl-10 pr-3' : 'px-3'}`}
      />
    </div>
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</label>}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="bg-[#0a0a0a] border border-neutral-800 text-neutral-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-600 resize-y font-mono"
    />
  </div>
);

const FileUpload = ({ label, accept, onFileSelect, file }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <input
        type="file"
        accept={accept}
        onChange={onFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className={`
        border-2 border-dashed rounded-lg p-6 text-center transition-colors
        ${file ? 'border-green-900/50 bg-green-900/10' : 'border-neutral-800 bg-[#0a0a0a] hover:border-neutral-700'}
      `}>
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm font-medium truncate">{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <Upload size={20} />
            <span className="text-sm">Click to upload {accept}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- Tool 1: Tag Automation Logic (FIXED) ---

const TagAutomationTool = ({ libsLoaded }) => {
  const [masterFile, setMasterFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [prefix, setPrefix] = useState("cus-");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [...prev, `> ${msg}`]);

  const processFiles = async () => {
    if (!libsLoaded) {
      alert("Libraries are still loading... please wait a moment.");
      return;
    }
    if (!masterFile || !zipFile) {
      alert("Please upload both the Master CSV and the Collections ZIP.");
      return;
    }

    setIsProcessing(true);
    setLogs(["> Starting automation process..."]);

    try {
      // 1. Parse Master CSV (Load as Array to preserve ALL rows)
      addLog("Parsing Master CSV...");
      const masterData = await new Promise((resolve) => {
        window.Papa.parse(masterFile, {
          header: true,
          complete: (results) => resolve(results.data),
          skipEmptyLines: true
        });
      });
      addLog(`Loaded ${masterData.length} rows from Master CSV.`);

      // 2. Process Zip to build a "Cheat Sheet" (Handle -> Set of Tags to Add)
      addLog("Scanning Collections ZIP...");
      const zip = new window.JSZip();
      const loadedZip = await zip.loadAsync(zipFile);
      
      const tagsToAddMap = new Map(); // Key: Handle, Value: Set(Tags)

      let collectionsProcessed = 0;

      for (const [filename, file] of Object.entries(loadedZip.files)) {
        if (!filename.endsWith('.csv') || filename.startsWith('__MACOSX')) continue;

        const tagName = `${prefix}${filename.replace('.csv', '')}`;
        addLog(`Found collection: ${filename} -> Tag: ${tagName}`);

        const content = await file.async("string");
        const collectionData = window.Papa.parse(content, { header: true }).data;

        collectionData.forEach(row => {
          const handle = row.Handle || row.handle; 
          if (handle) {
             if (!tagsToAddMap.has(handle)) {
               tagsToAddMap.set(handle, new Set());
             }
             tagsToAddMap.get(handle).add(tagName);
          }
        });
        collectionsProcessed++;
      }
      addLog(`Mapped tags for ${tagsToAddMap.size} unique handles.`);

      // 3. Update Master Data (Iterate Array to preserve rows)
      addLog("Applying tags to Master Data...");
      let updatedCount = 0;

      masterData.forEach(row => {
        const handle = row.Handle;
        
        // Only proceed if we have tags to add for this handle
        if (handle && tagsToAddMap.has(handle)) {
          const newTagsSet = tagsToAddMap.get(handle);

          // Python Logic Mirror: Check if row has Title OR has Tags
          // This ensures we update the main product row or rows that already have tags
          const hasTitle = row.Title && row.Title.toString().trim() !== '';
          const hasTags = row.Tags && row.Tags.toString().trim() !== '';

          if (hasTitle || hasTags) {
             const currentTagsStr = row.Tags ? row.Tags.toString() : "";
             let currentTagsList = currentTagsStr.split(',').map(t => t.trim()).filter(t => t !== "");
             const currentTagsSet = new Set(currentTagsList);

             let tagsAdded = false;
             newTagsSet.forEach(newTag => {
               if (!currentTagsSet.has(newTag)) {
                 currentTagsList.push(newTag);
                 currentTagsSet.add(newTag);
                 tagsAdded = true;
               }
             });

             if (tagsAdded) {
               row.Tags = currentTagsList.join(', ');
               updatedCount++;
             }
          }
        }
      });

      addLog(`Finished processing. Updated tags in ${updatedCount} rows.`);
      
      // 4. Export
      addLog("Generating final CSV...");
      const csv = window.Papa.unparse(masterData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "Master_Updated_With_Tags.csv");
      addLog("Download started. Process complete!");

    } catch (error) {
      console.error(error);
      addLog(`ERROR: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-neutral-400" />
            Input Data
          </h3>
          <div className="space-y-4">
            <FileUpload 
              label="1. Master Product CSV" 
              accept=".csv"
              file={masterFile}
              onFileSelect={(e) => setMasterFile(e.target.files[0])}
            />
            <FileUpload 
              label="2. Collections ZIP" 
              accept=".zip"
              file={zipFile}
              onFileSelect={(e) => setZipFile(e.target.files[0])}
            />
            <Input 
              label="Tag Prefix" 
              value={prefix} 
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g., cus-" 
            />
          </div>
          <div className="mt-6">
            <Button 
              onClick={processFiles} 
              disabled={isProcessing || !libsLoaded}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : (!libsLoaded ? 'Loading Libraries...' : 'Run Automation & Download')}
            </Button>
          </div>
        </Card>
      </div>

      <div className="h-full">
        <Card className="h-full min-h-[400px] flex flex-col font-mono text-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-neutral-800 mb-4">
            <Terminal size={16} className="text-neutral-400" />
            <span className="text-neutral-400 font-medium">Process Logs</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 text-neutral-300">
            {logs.length === 0 && <span className="text-neutral-600 italic">Waiting to start...</span>}
            {logs.map((log, i) => (
              <div key={i} className="break-all">{log}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Tool 2: JSON Creator Logic (Updated with body_html) ---

const JsonCreatorTool = () => {
  const [collections, setCollections] = useState([]);
  const [formData, setFormData] = useState({
    handle: "",
    title: "",
    body_html: "",
    sort_order: "best-selling",
    condition_tag: ""
  });

  const handleAdd = () => {
    if (!formData.handle || !formData.title || !formData.condition_tag) {
      alert("Please fill in required fields (Handle, Title, Condition Tag).");
      return;
    }

    const newCollection = {
      handle: formData.handle,
      title: formData.title,
      body_html: formData.body_html,
      sort_order: formData.sort_order,
      rules: [
        {
          column: "tag",
          relation: "equals",
          condition: formData.condition_tag
        }
      ]
    };

    setCollections([...collections, newCollection]);
    setFormData({ ...formData, handle: "", title: "", body_html: "", condition_tag: "" }); // Reset text fields
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(collections, null, 2)], { type: "application/json" });
    saveAs(blob, "smart_collections.json");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <h3 className="text-lg font-medium text-white mb-4">New Collection Definition</h3>
          <div className="space-y-4">
            <Input 
              label="Collection Title" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Summer Sale"
            />
            <Input 
              label="Handle" 
              value={formData.handle}
              onChange={(e) => setFormData({...formData, handle: e.target.value})}
              placeholder="e.g. summer-sale"
            />
            <TextArea 
              label="Description (HTML supported)" 
              value={formData.body_html}
              onChange={(e) => setFormData({...formData, body_html: e.target.value})}
              placeholder="<p>Our best summer collection...</p>"
              rows={4}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Sort Order</label>
              <select 
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                className="bg-[#0a0a0a] border border-neutral-800 text-neutral-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-600"
              >
                <option value="best-selling">Best Selling</option>
                <option value="alpha-asc">A-Z</option>
                <option value="alpha-desc">Z-A</option>
                <option value="price-asc">Price Low-High</option>
                <option value="price-desc">Price High-Low</option>
                <option value="created-desc">Newest First</option>
              </select>
            </div>
            <Input 
              label="Condition Tag" 
              value={formData.condition_tag}
              onChange={(e) => setFormData({...formData, condition_tag: e.target.value})}
              placeholder="e.g. cus-summer-sale"
            />
          </div>
          <div className="mt-6">
            <Button onClick={handleAdd} className="w-full">
              <Plus size={16} /> Add to List
            </Button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-7 h-full">
        <Card className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-800">
            <h3 className="text-lg font-medium text-white">JSON Preview</h3>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCollections([])} disabled={collections.length === 0}>
                 Clear
              </Button>
              <Button variant="secondary" onClick={downloadJson} disabled={collections.length === 0}>
                <Download size={16} /> Download JSON
              </Button>
            </div>
          </div>
          
          <div className="flex-1 bg-[#0a0a0a] rounded-md p-4 overflow-auto border border-neutral-800">
            {collections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-sm">
                <FileJson size={32} className="mb-2 opacity-50" />
                No collections added yet
              </div>
            ) : (
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(collections, null, 2)}
              </pre>
            )}
          </div>
          <div className="mt-2 text-xs text-neutral-500 text-right">
            {collections.length} items ready to export
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Tool 3: Importer UI ---

const ImporterTool = () => {
  const [file, setFile] = useState(null);
  const [shopUrl, setShopUrl] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("idle"); 
  const [resultMsg, setResultMsg] = useState("");

  const handleImport = async () => {
    if (!file || !shopUrl || !token) {
      alert("Please fill in all fields and upload a JSON file.");
      return;
    }

    setStatus("processing");
    setResultMsg("Reading file...");

    try {
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const collections = JSON.parse(fileContent);

      if (!Array.isArray(collections)) {
        throw new Error("Invalid JSON format. Expected an array of collections.");
      }

      setResultMsg(`Sending ${collections.length} collections to backend...`);

      const response = await fetch('/api/import_collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopUrl,
          accessToken: token,
          collections
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Server error occurred");
      }

      setStatus("success");
      setResultMsg(
        `Import Complete! Success: ${data.results.success}, Failed: ${data.results.failed}`
      );

    } catch (err) {
      console.error(err);
      setStatus("error");
      setResultMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-lg p-4 flex gap-3 text-yellow-500 text-sm">
         <AlertCircle size={20} className="shrink-0" />
         <p>
           <strong>Environment Note:</strong> This tool attempts to connect to <code>/api/import_collections</code>. 
           This will only work once you have deployed the backend code provided to a Vercel/Node.js environment.
         </p>
       </div>

      <Card>
        <h3 className="text-lg font-medium text-white mb-6">Store Configuration</h3>
        <div className="grid gap-6">
           <Input 
              label="Shopify Store URL" 
              placeholder="my-store.myshopify.com" 
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
           />
           <Input 
              label="Admin API Access Token" 
              placeholder="shpat_xxxxxxxxxxxxxxxx" 
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
           />
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-medium text-white mb-6">Import Source</h3>
        <FileUpload 
          label="Smart Collections JSON" 
          accept=".json"
          file={file}
          onFileSelect={(e) => setFile(e.target.files[0])}
        />
        
        {status !== 'idle' && (
          <div className={`mt-4 p-3 rounded-md text-sm font-mono flex items-center gap-2
            ${status === 'processing' ? 'bg-blue-900/20 text-blue-400' : ''}
            ${status === 'success' ? 'bg-green-900/20 text-green-400' : ''}
            ${status === 'error' ? 'bg-red-900/20 text-red-400' : ''}
          `}>
            {status === 'processing' && <Loader2 className="animate-spin" size={16} />}
            {status === 'success' && <CheckCircle size={16} />}
            {status === 'error' && <AlertCircle size={16} />}
            {resultMsg}
          </div>
        )}

        <div className="mt-6 flex justify-end">
           <Button 
             disabled={!file || !shopUrl || !token || status === 'processing'}
             onClick={handleImport}
           >
             {status === 'processing' ? 'Importing...' : 'Start Import'}
           </Button>
        </div>
      </Card>
    </div>
  );
};


// --- Tool 4: Collection Extractor (Updated) ---

const CollectionExtractorTool = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Initialize from localStorage
  const [collections, setCollections] = useState(() => {
    try {
      const saved = localStorage.getItem('extracted_collections');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 2. Save to localStorage whenever collections change
  useEffect(() => {
    localStorage.setItem('extracted_collections', JSON.stringify(collections));
  }, [collections]);

  const handleExtract = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/extract_collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to extract collections');
      
      if (data.collections && data.collections.length > 0) {
        setCollections(data.collections);
      } else {
        throw new Error('No collections found or store is password protected.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // 3. Search Filter Logic
  const filteredCollections = collections.filter(col => 
    col.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Globe size={18} className="text-neutral-400" />
          Target Store
        </h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="https://cakesbody.com" 
            />
          </div>
          <Button onClick={handleExtract} disabled={loading || !url}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Extract Collections'}
          </Button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-900/20 text-red-400 rounded-md text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </Card>

      {collections.length > 0 && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-neutral-800 pb-4 gap-4">
             <div>
                <h3 className="text-lg font-medium text-white">Extracted Collections ({filteredCollections.length})</h3>
                <p className="text-xs text-neutral-500 mt-1">Data saved locally</p>
             </div>
             
             <div className="flex gap-3 w-full md:w-auto">
                <div className="flex-1 md:w-64">
                    <Input 
                        placeholder="Search collections..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                    />
                </div>
                <Button variant="ghost" onClick={() => {
                  setCollections([]);
                  setSearchTerm('');
                  localStorage.removeItem('extracted_collections');
                }}>Clear</Button>
             </div>
          </div>

          <div className="space-y-3">
            {filteredCollections.map((col, idx) => (
              <div key={idx} className="bg-[#0a0a0a] border border-neutral-800 rounded-md overflow-hidden group hover:border-neutral-700 transition-colors">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white flex items-center gap-2">
                        {col.title}
                        <a href={col.url} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors">
                            <ExternalLink size={12} />
                        </a>
                    </div>
                    <div className="text-xs text-neutral-500 truncate font-mono mt-0.5">{col.url}</div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => copyToClipboard(col.title)} className="h-8 px-3 text-xs" title="Copy Title">
                        <Type size={14} className="mr-1.5"/> Title
                    </Button>
                    <Button variant="secondary" onClick={() => copyToClipboard(col.url)} className="h-8 px-3 text-xs" title="Copy URL">
                        <Link size={14} className="mr-1.5"/> Link
                    </Button>
                    <Button variant="secondary" onClick={() => copyToClipboard(col.description)} className="h-8 px-3 text-xs" title="Copy Description HTML">
                        <FileCode size={14} className="mr-1.5"/> Desc
                    </Button>
                  </div>
                </div>

                {/* Optional HTML Preview */}
                {col.description && (
                    <div className="bg-[#050505] border-t border-neutral-800 px-4 py-2">
                        <details className="text-xs text-neutral-400">
                            <summary className="cursor-pointer hover:text-neutral-300 select-none flex items-center gap-2">
                                <FileText size={12} /> Show Description HTML Preview
                            </summary>
                            <div className="mt-2 font-mono text-[10px] leading-relaxed opacity-70 bg-black p-2 rounded border border-neutral-800 overflow-x-auto">
                                {col.description.substring(0, 300)}
                                {col.description.length > 300 && '...'}
                            </div>
                        </details>
                    </div>
                )}
              </div>
            ))}
            
            {filteredCollections.length === 0 && (
                <div className="text-center py-12 text-neutral-600">
                    <Search size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No collections match your search.</p>
                </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};


// --- Main App Layout ---

const App = () => {
  const [activeTab, setActiveTab] = useState("tag-automation");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [libsLoaded, setLibsLoaded] = useState(false);

  // Load external libraries (PapaParse, JSZip) dynamically
  useEffect(() => {
    const loadLibs = async () => {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
        setLibsLoaded(true);
      } catch (e) {
        console.error("Failed to load libraries", e);
      }
    };
    loadLibs();
  }, []);

  const tools = [
    { id: "tag-automation", label: "Tag Automation", icon: <Database size={18} /> },
    { id: "json-creator", label: "JSON Creator", icon: <FileJson size={18} /> },
    { id: "importer", label: "Collection Importer", icon: <Upload size={18} /> },
    { id: "extractor", label: "Collection Extractor", icon: <Link size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 font-sans flex overflow-hidden selection:bg-neutral-700 selection:text-white">
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-neutral-800 bg-[#0a0a0a] flex flex-col shrink-0`}>
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <div className="flex items-center gap-2 font-semibold text-white tracking-tight">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
            Nexus
          </div>
        </div>

        <div className="p-4 space-y-8 overflow-y-auto flex-1">
          <div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 px-2">Apps</div>
            <nav className="space-y-1">
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition-colors text-sm">
                <LayoutDashboard size={18} /> Dashboard
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-white bg-neutral-800 rounded-md transition-colors text-sm font-medium">
                <ShoppingBag size={18} /> Shopify Tools
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition-colors text-sm">
                <Settings size={18} /> Settings
              </a>
            </nav>
          </div>

          <div>
             <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 px-2">Other</div>
             <nav className="space-y-1">
               <a href="#" className="flex items-center gap-3 px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition-colors text-sm">
                 <Search size={18} /> Search
               </a>
             </nav>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-white">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Admin</div>
              <div className="text-xs text-neutral-500 truncate">admin@nexus.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-neutral-800 bg-[#0a0a0a]/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-neutral-400 hover:text-white">
               <Menu size={20} />
             </button>
             <div className="h-4 w-px bg-neutral-800" />
             <h1 className="text-sm font-medium text-white">Shopify Tools</h1>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Shopify Automation Suite</h2>
              <p className="text-neutral-500">Manage your product data, automate tagging, and handle collections.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-8">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all
                    ${activeTab === tool.id 
                      ? 'bg-neutral-800 border-neutral-700 text-white shadow-sm' 
                      : 'bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'}
                  `}
                >
                  {tool.icon}
                  {tool.label}
                </button>
              ))}
            </div>

            {/* Tool Content Render */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'tag-automation' && <TagAutomationTool libsLoaded={libsLoaded} />}
              {activeTab === 'json-creator' && <JsonCreatorTool />}
              {activeTab === 'importer' && <ImporterTool />}
              {activeTab === 'extractor' && <CollectionExtractorTool />}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;