const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', function open() {
    console.log('✅ Conectado ao WebSocket Server');

    // Envia registro
    ws.send(JSON.stringify({ type: 'register', clientId: 'test_script' }));

    // Envia heartbeat
    setTimeout(() => {
        console.log('💓 Enviando heartbeat...');
        ws.send(JSON.stringify({ type: 'heartbeat' }));
    }, 1000);
});

ws.on('message', function incoming(data) {
    console.log('📩 Recebido:', data.toString());

    const message = JSON.parse(data);
    if (message.type === 'heartbeat_ack') {
        console.log('✅ Heartbeat ACK recebido!');
        process.exit(0);
    }
});

ws.on('error', function error(err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
