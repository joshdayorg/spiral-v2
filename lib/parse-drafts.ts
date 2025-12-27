export interface ParsedDraft {
  title: string;
  strategy: string;
  content: string;
  wordCount: number;
}

export function parseDrafts(text: string): ParsedDraft[] {
  const drafts: ParsedDraft[] = [];
  
  const strategyPattern = /Strategy:\s*([^\n]+)/i;
  const wordCountPattern = /Word\s*count:\s*(\d+)/i;
  
  // Split by draft headers
  const parts = text.split(/(?=\*?\*?Draft\s*\d+:)/i);
  
  for (const part of parts) {
    if (!part.trim()) continue;
    
    // Check if this part starts with a draft header
    const headerMatch = part.match(/\*?\*?Draft\s*(\d+):\s*([^*\n]+)\*?\*?/i);
    if (!headerMatch) continue;
    
    const title = headerMatch[2].trim().replace(/\*+/g, '');
    
    // Extract strategy
    const strategyMatch = part.match(strategyPattern);
    const strategy = strategyMatch 
      ? strategyMatch[1].trim().replace(/\*+/g, '').replace(/"/g, '')
      : "Default";
    
    // Extract word count
    const wordCountMatch = part.match(wordCountPattern);
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 0;
    
    // Extract content - everything between strategy line and word count/next draft
    let content = part;
    
    // Remove the header line
    content = content.replace(/\*?\*?Draft\s*\d+:[^*\n]+\*?\*?\s*\n?/i, '');
    
    // Remove strategy line
    content = content.replace(/Strategy:\s*[^\n]+\n?/i, '');
    
    // Remove word count line and separator
    content = content.replace(/---\s*\n?/g, '');
    content = content.replace(/Word\s*count:\s*\d+\s*words?\s*\n?/gi, '');
    
    // Remove quotes and clean up
    content = content.replace(/^["']+|["']+$/gm, '');
    content = content.trim();
    
    // Skip if no content
    if (!content) continue;
    
    // Calculate word count if not provided
    const finalWordCount = wordCount || content.split(/\s+/).filter(w => w.length > 0).length;
    
    drafts.push({
      title,
      strategy,
      content,
      wordCount: finalWordCount,
    });
  }
  
  return drafts;
}

export function hasDrafts(text: string): boolean {
  return /\*?\*?Draft\s*1:/i.test(text);
}
