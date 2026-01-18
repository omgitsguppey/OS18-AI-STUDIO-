
export const processDramaDataInWorker = (text: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // We define the worker code as a string to create a Blob URL.
    // This allows us to use a Web Worker without complex build configuration.
    const workerCode = `
      self.onmessage = function(e) {
        const text = e.data;
        try {
          let cleanText = text || '{}';
          // Clean up markdown code blocks if present
          if (cleanText.includes('\`\`\`')) {
            cleanText = cleanText.replace(/\`\`\`json|\`\`\`/g, '').trim();
          }
          
          const data = JSON.parse(cleanText);
          const rawEvents = data.events || [];
          
          // Sort events chronologically (newest first)
          const sortedEvents = rawEvents.sort((a, b) => {
             const dateA = new Date(a.date).getTime();
             const dateB = new Date(b.date).getTime();
             return dateB - dateA; 
          });
          
          self.postMessage({ 
            success: true, 
            data: {
              events: sortedEvents,
              summary: data.summary || "No summary available."
            }
          });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    worker.onmessage = (e) => {
      URL.revokeObjectURL(url);
      worker.terminate();
      if (e.data.success) {
        resolve(e.data.data);
      } else {
        // Fallback to empty structure on error
        resolve({ events: [], summary: "Failed to parse data." });
      }
    };

    worker.onerror = (err) => {
        console.error("Worker Error:", err);
        URL.revokeObjectURL(url);
        worker.terminate();
        resolve({ events: [], summary: "Worker processing failed." });
    };

    worker.postMessage(text);
  });
};
