// middleware/metricsMiddleware.js - COLETA DE MÉTRICAS

/**
 * Armazena métricas em memória
 * Em produção, considere usar Prometheus ou similar
 */
const metrics = {
    requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatusCode: {},
    },
    performance: {
        responseTimes: [],
        avgResponseTime: 0,
    },
    errors: {
        total: 0,
        byType: {},
    },
    system: {
        startTime: Date.now(),
        lastReset: Date.now(),
    },
};

/**
 * Middleware para coletar métricas de requisições
 */
const metricsMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // Incrementa contador total
    metrics.requests.total++;

    // Incrementa contador por método
    metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;

    // Captura quando a resposta é enviada
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Armazena tempo de resposta
        metrics.performance.responseTimes.push(duration);

        // Mantém apenas os últimos 1000 tempos de resposta
        if (metrics.performance.responseTimes.length > 1000) {
            metrics.performance.responseTimes.shift();
        }

        // Calcula média
        const sum = metrics.performance.responseTimes.reduce((a, b) => a + b, 0);
        metrics.performance.avgResponseTime = Math.round(sum / metrics.performance.responseTimes.length);

        // Incrementa contador por rota
        const route = req.route ? req.route.path : req.path;
        metrics.requests.byRoute[route] = (metrics.requests.byRoute[route] || 0) + 1;

        // Incrementa contador por status code
        const statusCode = res.statusCode;
        metrics.requests.byStatusCode[statusCode] = (metrics.requests.byStatusCode[statusCode] || 0) + 1;

        // Incrementa contador de erros se status >= 400
        if (statusCode >= 400) {
            metrics.errors.total++;
            const errorType = statusCode >= 500 ? '5xx' : '4xx';
            metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
        }
    });

    next();
};

/**
 * Retorna as métricas coletadas
 */
const getMetrics = () => {
    const uptime = Math.floor((Date.now() - metrics.system.startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    return {
        uptime,
        uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
        requests: {
            total: metrics.requests.total,
            byMethod: metrics.requests.byMethod,
            topRoutes: getTopRoutes(10),
            byStatusCode: metrics.requests.byStatusCode,
        },
        performance: {
            avgResponseTime: `${metrics.performance.avgResponseTime}ms`,
            p50: calculatePercentile(50),
            p95: calculatePercentile(95),
            p99: calculatePercentile(99),
        },
        errors: {
            total: metrics.errors.total,
            rate: metrics.requests.total > 0
                ? `${((metrics.errors.total / metrics.requests.total) * 100).toFixed(2)}%`
                : '0%',
            byType: metrics.errors.byType,
        },
        system: {
            memory: {
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            },
            cpu: process.cpuUsage(),
        },
    };
};

/**
 * Retorna as rotas mais acessadas
 */
const getTopRoutes = (limit = 10) => {
    return Object.entries(metrics.requests.byRoute)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([route, count]) => ({ route, count }));
};

/**
 * Calcula percentil de tempo de resposta
 */
const calculatePercentile = (percentile) => {
    if (metrics.performance.responseTimes.length === 0) return 0;

    const sorted = [...metrics.performance.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return `${sorted[index]}ms`;
};

/**
 * Reseta as métricas
 */
const resetMetrics = () => {
    metrics.requests = {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatusCode: {},
    };
    metrics.performance = {
        responseTimes: [],
        avgResponseTime: 0,
    };
    metrics.errors = {
        total: 0,
        byType: {},
    };
    metrics.system.lastReset = Date.now();
};

/**
 * Formata métricas para Prometheus (opcional)
 */
const getPrometheusMetrics = () => {
    const lines = [];

    // Total de requisições
    lines.push('# HELP http_requests_total Total de requisições HTTP');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${metrics.requests.total}`);

    // Requisições por método
    lines.push('# HELP http_requests_by_method Requisições por método HTTP');
    lines.push('# TYPE http_requests_by_method counter');
    Object.entries(metrics.requests.byMethod).forEach(([method, count]) => {
        lines.push(`http_requests_by_method{method="${method}"} ${count}`);
    });

    // Tempo médio de resposta
    lines.push('# HELP http_response_time_avg Tempo médio de resposta em ms');
    lines.push('# TYPE http_response_time_avg gauge');
    lines.push(`http_response_time_avg ${metrics.performance.avgResponseTime}`);

    // Total de erros
    lines.push('# HELP http_errors_total Total de erros HTTP');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${metrics.errors.total}`);

    return lines.join('\n');
};

module.exports = {
    metricsMiddleware,
    getMetrics,
    resetMetrics,
    getPrometheusMetrics,
};
