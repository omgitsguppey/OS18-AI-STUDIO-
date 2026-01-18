
export const LocalIntelligence = {
  // 1. Hybrid NLP for LyricsAI
  analyzeText: (text: string) => {
    const words = text.trim().split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const complexity = Math.min(100, Math.round((uniqueWords / words.length) * 100 * 1.5)); 
    
    // Syllable approximation (vowel groups)
    const syllables = text.split(/[aeiouy]+/i).length;
    const rhythmScore = Math.min(100, Math.round((syllables / words.length) * 30));

    // Structure detection (line count variance)
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const lineLengths = lines.map(l => l.length);
    const avgLen = lineLengths.reduce((a,b) => a+b, 0) / (lineLengths.length || 1);
    const variance = lineLengths.reduce((a, b) => a + Math.abs(b - avgLen), 0);
    const structureScore = Math.max(0, 100 - Math.round(variance / 2));

    return {
      vocabularyComplexity: complexity,
      rhythmicSophistication: rhythmScore,
      structuralInnovation: structureScore
    };
  },

  // 3. Client-Side Color Theory for BrandKit/Playlist
  generatePalette: (seed: string) => {
    // Simple hash to hue
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    return [
      { name: "Primary", hex: hslToHex(hue, 70, 50), usage: "Main Brand Color" },
      { name: "Secondary", hex: hslToHex((hue + 180) % 360, 60, 45), usage: "Accent" },
      { name: "Neutral", hex: hslToHex(hue, 10, 90), usage: "Background" },
      { name: "Dark", hex: hslToHex(hue, 20, 20), usage: "Text" }
    ];
  },

  // 6. Deterministic Math for Pricing
  calculatePricingTiers: (baseEstimate: number) => {
    return {
        oneTime: `$${Math.round(baseEstimate * 2.5)}`,
        subscriptionMonthly: `$${Math.round(baseEstimate * 0.8)}/mo`,
        subscriptionYearly: `$${Math.round(baseEstimate * 0.8 * 10)}/yr`
    };
  },

  // 5. Procedural SVG Generation for Achievements
  generateAwardSVG: (artist: string, song: string, streams: string, style: string) => {
    const gradients: Record<string, string[]> = {
        "Gold Plaque": ["#FFD700", "#B8860B"],
        "Platinum Disc": ["#E5E4E2", "#A9A9A9"],
        "Diamond": ["#E0FFFF", "#00FFFF"],
        "Neon Cyberpunk": ["#FF00FF", "#00FFFF"],
        "Minimalist Matte": ["#333", "#111"],
        "Frosted Glass": ["#EEE", "#CCC"],
        "Vintage Vinyl": ["#111", "#222"]
    };
    
    const colors = gradients[style] || gradients["Gold Plaque"];
    const id = Math.random().toString(36).substr(2, 9);
    
    const svg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow-${id}">
            <feDropShadow dx="0" dy="4" stdDeviation="10" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="1024" height="1024" fill="#111" />
      <rect x="50" y="50" width="924" height="924" fill="none" stroke="url(#grad-${id})" stroke-width="20" rx="40" />
      <circle cx="512" cy="400" r="300" fill="url(#grad-${id})" filter="url(#shadow-${id})" />
      <circle cx="512" cy="400" r="100" fill="#1a1a1a" />
      <text x="512" y="800" font-family="sans-serif" font-weight="bold" font-size="80" fill="white" text-anchor="middle">${streams}</text>
      <text x="512" y="880" font-family="sans-serif" font-size="40" fill="#ccc" text-anchor="middle">STREAMS</text>
      <text x="512" y="950" font-family="sans-serif" font-size="30" fill="#888" text-anchor="middle">${artist} - ${song}</text>
    </svg>`;
    
    return btoa(svg);
  },

  // 4. Heuristic CSV Parsing
  parseCSV: (text: string) => {
    const lines = text.split('\n');
    const records = [];
    let headers = [];
    
    for(let i=0; i<lines.length; i++) {
        const line = lines[i].trim();
        if(!line) continue;
        
        // Basic CSV split ignoring commas in quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
        
        if (cols.some(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('period'))) {
            headers = cols.map(c => c.toLowerCase());
            continue;
        }
        
        if (headers.length > 0 && cols.length >= 3) {
            const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('period'));
            const trackIdx = headers.findIndex(h => h.includes('track') || h.includes('song') || h.includes('title'));
            const revIdx = headers.findIndex(h => h.includes('amount') || h.includes('net') || h.includes('royal') || h.includes('pay'));
            const platIdx = headers.findIndex(h => h.includes('source') || h.includes('service') || h.includes('dsp') || h.includes('platform'));
            
            if (trackIdx > -1 && revIdx > -1) {
                records.push({
                    date: dateIdx > -1 ? cols[dateIdx] : new Date().toISOString().split('T')[0],
                    label: "Imported",
                    trackTitle: cols[trackIdx],
                    artist: "Various",
                    platform: platIdx > -1 ? cols[platIdx] : "Unknown",
                    revenueAmount: parseFloat(cols[revIdx]) || 0,
                    currency: "USD"
                });
            }
        }
    }
    return records;
  }
};
