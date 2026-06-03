import type { WebSearchResult } from '../processingTypes';

const API_BASE = 'https://api.opensubtitles.com/api/v1';

function getApiKey(): string | undefined {
    const key = process.env.OPENSUBTITLES_API_KEY?.trim();
    return key || undefined;
}

async function loadAxios() {
    try {
        const mod = await import('axios');
        return mod.default;
    } catch {
        return null;
    }
}

function mapAttributes(item: {
    id: string;
    attributes: {
        language?: string;
        download_count?: number;
        ratings?: number;
        files?: Array<{ file_name?: string; file_id?: number }>;
        feature_details?: { feature?: { title?: string } };
    };
}): WebSearchResult | null {
    const attrs = item.attributes;
    const file = attrs.files?.[0];
    const filename =
        file?.file_name ||
        attrs.feature_details?.feature?.title ||
        `subtitle-${item.id}`;

    return {
        id: String(item.id),
        filename,
        source: 'OpenSubtitles',
        language: attrs.language || 'Unknown',
        downloads: attrs.download_count ?? 0,
        rating: typeof attrs.ratings === 'number' ? attrs.ratings : 0,
    };
}

export function isOpenSubtitlesConfigured(): boolean {
    return Boolean(getApiKey());
}

export async function searchSubtitlesByQuery(query: string): Promise<WebSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(
            'OpenSubtitles API key is not configured. Set OPENSUBTITLES_API_KEY in your environment before starting the app.'
        );
    }

    const axios = await loadAxios();
    if (!axios) {
        throw new Error(
            'axios is not installed. Run npm install to enable live subtitle search.'
        );
    }

    const response = await axios.get(`${API_BASE}/subtitles`, {
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Tarjem v0.1',
        },
        params: {
            query: query.trim(),
            languages: 'ar,en',
            order_by: 'download_count',
            order_direction: 'desc',
        },
        timeout: 20000,
    });

    const data = response.data?.data;
    if (!Array.isArray(data)) return [];

    return data
        .map((item: { id: string; attributes: Parameters<typeof mapAttributes>[0]['attributes'] }) =>
            mapAttributes(item)
        )
        .filter((r): r is WebSearchResult => r !== null);
}

export async function searchSubtitlesByHash(
    hash: string,
    fileSize: number
): Promise<WebSearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(
            'OpenSubtitles API key is not configured. Set OPENSUBTITLES_API_KEY in your environment.'
        );
    }

    const axios = await loadAxios();
    if (!axios) {
        throw new Error('axios is not installed. Run npm install to enable live subtitle search.');
    }

    const response = await axios.get(`${API_BASE}/subtitles`, {
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Tarjem v0.1',
        },
        params: {
            moviehash: hash,
            moviebytesize: fileSize,
            languages: 'ar,en',
            order_by: 'download_count',
            order_direction: 'desc',
        },
        timeout: 20000,
    });

    const data = response.data?.data;
    if (!Array.isArray(data)) return [];

    return data
        .map((item: { id: string; attributes: Parameters<typeof mapAttributes>[0]['attributes'] }) =>
            mapAttributes(item)
        )
        .filter((r): r is WebSearchResult => r !== null);
}
