import axios from 'axios';

export class OpenSubtitlesService {
  private baseUrl = 'https://api.opensubtitles.com/api/v1';
  private store: any;

  constructor(store: any) {
    this.store = store;
  }

  private getApiKey(): string {
    return (this.store.get('opensubtitles_api_key') as string) || '';
  }

  private getHeaders() {
    return {
      'Api-Key': this.getApiKey(),
      'Content-Type': 'application/json',
      'User-Agent': 'Tarjem v1.0.0' // OpenSubtitles requires a User-Agent
    };
  }

  async search(query: string, language: string = 'en') {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API Key missing');

    try {
      const response = await axios.get(`${this.baseUrl}/subtitles`, {
        params: {
          query: query,
          languages: language,
        },
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('OpenSubtitles Search Error:', error);
      throw error;
    }
  }

  async searchByHash(hash: string, language: string = 'en') {
     const apiKey = this.getApiKey();
     if (!apiKey) {
       console.log('OpenSubtitles API key not configured, skipping...');
       return { data: [] }; // Return empty results instead of throwing
     }

     try {
       console.log('Searching OpenSubtitles with hash:', hash);
       // OpenSubtitles uses 'moviehash' parameter
       const response = await axios.get(`${this.baseUrl}/subtitles`, {
         params: {
           moviehash: hash,
           languages: language,
         },
         headers: this.getHeaders()
       });
       console.log('OpenSubtitles results:', response.data?.data?.length || 0, 'subtitles');
       
       // Map to SubtitleResult interface
       const keywords = (response.data?.data || []).map((item: any) => {
         const attrs = item.attributes;
         const fileId = attrs.files?.[0]?.file_id;
         return {
           id: item.id,
           filename: attrs.release || attrs.files?.[0]?.file_name || 'Unknown',
           source: 'OpenSubtitles',
           language: attrs.language,
           downloads: attrs.download_count || 0,
           rating: (attrs.ratings || 0) / 2, // Normalize 10-scale to 5-scale if needed, OS uses 0-10 usually
           url: fileId ? `opensubtitles://${fileId}` : ''
         };
       });

       return { data: keywords };
     } catch (error) {
       console.error('OpenSubtitles Hash Search Error:', error);
       // Return empty result rather than crash
       return { data: [] };
     }
  }

  async getDownloadLink(fileId: number) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API Key missing');

    try {
      const response = await axios.post(`${this.baseUrl}/download`, {
        file_id: fileId
      }, {
        headers: this.getHeaders()
      });
      return response.data; // Should contain { link: "..." }
    } catch (error) {
      console.error('OpenSubtitles Download Link Error:', error);
      throw error;
    }
  }
}

export class SubDLService {
  private baseUrl = 'https://api.subdl.com/api/v1';
  private store: any;

  constructor(store: any) {
    this.store = store;
  }

  private getApiKey(): string {
    return (this.store.get('subdl_api_key') as string) || '';
  }

  async search(query: string, language: string = 'en') {
    const apiKey = this.getApiKey();
    if (!apiKey) return { results: [] }; // Graceful fallback

    try {
      const response = await axios.get(`${this.baseUrl}/subtitles`, {
        params: {
          api_key: apiKey,
          film_name: query,
          languages: language,
        }
      });
      return response.data;
    } catch (error) {
      console.error('SubDL Search Error:', error);
      return { results: [] };
    }
  }
}
