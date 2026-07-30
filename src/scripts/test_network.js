// 🔍 Network Connectivity Diagnostics for MongoDB Atlas
import net from 'net';
import { URL } from 'url';

const shards = [
    'ac-syye9yy-shard-00-00.jtele7g.mongodb.net',
    'ac-syye9yy-shard-00-01.jtele7g.mongodb.net',
    'ac-syye9yy-shard-00-02.jtele7g.mongodb.net'
];

const port = 27017;

console.log('🚀 Starting MongoDB Network Diagnostic...');
console.log(`Checking connectivity to Atlas shards on port ${port}...\n`);

async function checkConnection(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const start = Date.now();
        
        socket.setTimeout(10000); // 10 second timeout

        socket.on('connect', () => {
            const duration = Date.now() - start;
            console.log(`✅ CONNECTED to ${host}:${port} in ${duration}ms`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log(`❌ TIMEOUT connecting to ${host}:${port} (10s reached)`);
            socket.destroy();
            resolve(false);
        });

        socket.on('error', (err) => {
            console.log(`❌ ERROR connecting to ${host}:${port}: ${err.message}`);
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}

(async () => {
    let allOk = true;
    for (const shard of shards) {
        const ok = await checkConnection(shard, port);
        if (!ok) allOk = false;
    }

    console.log('\n' + '='.repeat(40));
    if (allOk) {
        console.log('🟢 ALL SHARDS ARE REACHABLE!');
        console.log('The network connection is fine.');
    } else {
        console.log('🔴 NETWORK FIREWALL DETECTED!');
        console.log('One or more shards are unreachable.');
        console.log('\nDIAGNOSIS: The MongoDB Atlas Whitelist is likely blocking the server IP.');
        console.log('FIX: Go to MongoDB Atlas > Network Access and add "0.0.0.0/0" (Allow from Anywhere).');
    }
    console.log('='.repeat(40) + '\n');
})();
