export function isLoopbackHost(host) {
    const value = String(host || '').trim().toLowerCase();
    return value === 'localhost' || value === '127.0.0.1' || value === '::1' || value === '[::1]';
}

export function normalizeServerInput(hostOrUrl, port = '3000', preferredProtocol = '') {
    const rawHost = String(hostOrUrl || '').trim();
    let rawPort = String(port || '').trim() || '3000';

    if (!rawHost) {
        return { host: '', port: rawPort, protocol: 'https', url: '' };
    }

    if (/^https?:\/\//i.test(rawHost)) {
        const parsed = new URL(rawHost);
        return {
            host: parsed.hostname,
            port: parsed.port || rawPort,
            protocol: parsed.protocol.replace(':', ''),
            url: parsed.origin.replace(/\/+$/, ''),
        };
    }

    let host = rawHost.replace(/\/+$/, '');
    const hostPortMatch = host.match(/^([^:]+):(\d+)$/);
    if (hostPortMatch) {
        host = hostPortMatch[1];
        rawPort = hostPortMatch[2];
    }

    const protocol = preferredProtocol || (isLoopbackHost(host) ? 'http' : 'https');
    return {
        host,
        port: rawPort,
        protocol,
        url: `${protocol}://${host}:${rawPort}`.replace(/\/+$/, ''),
    };
}

export function buildServerUrl(hostOrUrl, port = '3000', preferredProtocol = '') {
    return normalizeServerInput(hostOrUrl, port, preferredProtocol).url;
}
