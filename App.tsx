
import React, { useState, useRef, useEffect } from 'react';
import { pdfService } from './services/pdfService';
import { geminiService } from './services/geminiService';
import { OCRService } from './services/ocrService';
import { ProcessedDocument, TranslationOptions, OCRQuality } from './types';
import { APP_CONFIG } from './constants';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<ProcessedDocument | null>(null);
  const [options, setOptions] = useState<TranslationOptions>({
    preserveLayout: true,
    preserveKeywords: true,
    ocrQuality: OCRQuality.MEDIUM,
    targetLanguage: 'pt-BR'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup OCR workers on unmount
    return () => {
      OCRService.terminate();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > APP_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`Arquivo muito grande! Máximo ${APP_CONFIG.MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      setFile(selected);
      setDoc(null);
      setProgress(0);
      setStatusMsg('');
    }
  };

  const processDoc = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusMsg('Carregando bibliotecas e iniciando...');

    try {
      // 1. Content and Layout Extraction
      setStatusMsg('Analisando estrutura do documento...');
      const layouts = await pdfService.extractContent(file, (p) => setProgress(5 + p * 0.45));
      
      // 2. Text Aggregation
      setStatusMsg('Preparando texto para tradução...');
      const textBlocks = layouts.flatMap(l => l.blocks.map(b => b.text));
      // Remove empty or whitespace-only strings
      const validTexts = textBlocks.filter(t => t.trim().length > 0);
      const uniqueTexts = Array.from(new Set(validTexts));
      
      // 3. Intelligent Translation via Gemini
      setStatusMsg('Traduzindo com Gemini AI...');
      const fullTextToTranslate = uniqueTexts.join('\n--BLOCK--\n');
      const markedText = options.preserveKeywords ? geminiService.markKeywords(fullTextToTranslate) : fullTextToTranslate;
      
      // Translate in chunks to handle token limits
      const chunks: string[] = [];
      const MAX_CHUNK_LENGTH = APP_CONFIG.CHUNK_SIZE;
      let currentChunk = "";
      
      markedText.split('\n--BLOCK--\n').forEach(block => {
        if ((currentChunk.length + block.length) > MAX_CHUNK_LENGTH) {
          chunks.push(currentChunk);
          currentChunk = block;
        } else {
          currentChunk += (currentChunk ? '\n--BLOCK--\n' : '') + block;
        }
      });
      if (currentChunk) chunks.push(currentChunk);

      let translatedResult = "";
      for (let i = 0; i < chunks.length; i++) {
        const chunkProgress = Math.round(((i) / chunks.length) * 40);
        setProgress(50 + chunkProgress);
        setStatusMsg(`Traduzindo blocos ${i + 1}/${chunks.length}...`);
        const translatedChunk = await geminiService.translate(chunks[i]);
        translatedResult += (translatedResult ? '\n--BLOCK--\n' : '') + translatedChunk;
      }

      // Map translations back to original strings
      const translatedBlocks = translatedResult.split('\n--BLOCK--\n');
      const translationMap: Record<string, string> = {};
      uniqueTexts.forEach((original, idx) => {
        translationMap[original] = translatedBlocks[idx] || original;
      });

      // 4. PDF Generation
      setStatusMsg('Reconstruindo PDF com novo layout...');
      setProgress(95);
      const pdfBytes = await pdfService.generateTranslatedPDF(layouts, translationMap);
      
      setDoc({
        name: file.name,
        originalText: uniqueTexts.join('\n'),
        translatedText: translatedBlocks.join('\n'),
        pages: layouts,
        status: 'completed',
        progress: 100
      });

      // Trigger automatic download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `traduzido_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg('Processamento concluído!');
      setProgress(100);
    } catch (err: any) {
      console.error('Processing Error:', err);
      setStatusMsg('Erro fatal: ' + (err.message || 'Erro desconhecido'));
      setDoc(prev => prev ? { ...prev, status: 'error', error: err.message } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1f2937] antialiased">
      <div className="max-w-6xl mx-auto p-6 md:p-12">
        <header className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-600">OCR-Translate <span className="text-gray-900">Pro</span></h1>
            <p className="text-gray-500 font-medium mt-1">Preservação de layout e keywords para documentos técnicos.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> System Active
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div 
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                if (e.dataTransfer.files[0]) {
                  const f = e.dataTransfer.files[0];
                  if (f.size <= APP_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) setFile(f);
                  else alert("Arquivo muito grande.");
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${file ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300 bg-white'}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
              
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${file ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                {file ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                )}
              </div>
              
              {file ? (
                <div>
                  <p className="font-bold text-gray-900 truncate max-w-full px-2">{file.name}</p>
                  <p className="text-sm text-blue-500 mt-1 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-gray-900">Upload PDF ou Imagem</p>
                  <p className="text-sm text-gray-500 mt-1">Arraste aqui ou explore arquivos</p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Parâmetros
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Qualidade do OCR</label>
                  <select 
                    className="w-full bg-gray-50 border-gray-200 rounded-xl text-sm py-2.5 focus:ring-blue-500 focus:border-blue-500"
                    value={options.ocrQuality}
                    onChange={(e) => setOptions({...options, ocrQuality: e.target.value as OCRQuality})}
                  >
                    <option value={OCRQuality.LOW}>Rápido (Baixa)</option>
                    <option value={OCRQuality.MEDIUM}>Equilibrado (Recomendado)</option>
                    <option value={OCRQuality.HIGH}>Máxima (Lento)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Preservar Layout</span>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500" checked={options.preserveLayout} onChange={(e) => setOptions({...options, preserveLayout: e.target.checked})} />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Keywords de Programação</span>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500" checked={options.preserveKeywords} onChange={(e) => setOptions({...options, preserveKeywords: e.target.checked})} />
                </div>
              </div>

              <button
                onClick={processDoc}
                disabled={!file || isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${(!file || isProcessing) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processando...
                  </>
                ) : 'Iniciar Tradução'}
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="lg:col-span-8 space-y-6">
            {isProcessing && (
              <div className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-600 text-lg">
                    {Math.round(progress)}%
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{statusMsg}</h3>
                <p className="text-gray-500 text-sm max-w-xs">Isso pode levar alguns minutos dependendo do número de páginas e complexidade.</p>
              </div>
            )}

            {doc && doc.status === 'completed' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-900">Prévia do Conteúdo</h3>
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Completo</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const blob = new Blob([doc.translatedText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `texto_${doc.name}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      Exportar Texto
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-1/2 p-4 overflow-y-auto border-r bg-gray-50/30">
                    <span className="text-[10px] font-black text-gray-300 uppercase block mb-3 sticky top-0 bg-transparent">Original (Extraído)</span>
                    <pre className="text-xs mono text-gray-500 whitespace-pre-wrap leading-relaxed">{doc.originalText}</pre>
                  </div>
                  <div className="w-1/2 p-4 overflow-y-auto bg-white">
                    <span className="text-[10px] font-black text-blue-300 uppercase block mb-3 sticky top-0 bg-white">Tradução (Gemini Optimized)</span>
                    <pre className="text-xs mono text-gray-800 whitespace-pre-wrap leading-relaxed">{doc.translatedText}</pre>
                  </div>
                </div>
              </div>
            )}

            {!isProcessing && !doc && (
              <div className="bg-white h-[600px] rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center p-10">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-400">Nenhum documento processado</h3>
                <p className="text-gray-300 text-sm mt-2 max-w-xs">Faça o upload de um PDF técnico para ver a tradução inteligente aqui.</p>
              </div>
            )}

            {doc && doc.status === 'error' && (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-700">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Falha no Processamento
                </h3>
                <p className="text-sm opacity-90">{doc.error}</p>
                <button onClick={() => setDoc(null)} className="mt-4 text-xs font-bold uppercase tracking-wider hover:underline">Tentar novamente</button>
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400 font-medium">
          &copy; 2024 OCR-Translate Pro • Engine: Gemini 3 Flash • Libs: PDF.js, pdf-lib, Tesseract.js
        </p>
      </footer>
    </div>
  );
};

export default App;
