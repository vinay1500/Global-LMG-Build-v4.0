import net from 'node:net';
import fs from 'node:fs';

const parseEnvFile = (path) => {
  if (!fs.existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => {
        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [match[1], value];
      })
  );
};

const backendEnv = parseEnvFile('backend/.env');
const adminEnv = parseEnvFile('admin_backend/.env');
const host =
  process.env.CLAMAV_HOST ||
  adminEnv.CLAMAV_HOST ||
  backendEnv.CLAMAV_HOST ||
  '127.0.0.1';
const port = Number(
  process.env.CLAMAV_PORT ||
    adminEnv.CLAMAV_PORT ||
    backendEnv.CLAMAV_PORT ||
    3310
);

const cleanPayload = Buffer.from('Global LMG ClamAV clean smoke file.\n', 'utf8');
const eicarPayload = Buffer.from(
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  'ascii'
);

const scanBuffer = (content) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const chunks = [];
    let settled = false;

    const settle = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(30_000);
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < content.length; offset += 64 * 1024) {
        const chunk = content.subarray(offset, Math.min(offset + 64 * 1024, content.length));
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on('timeout', () =>
      settle({ ok: false, status: 'scan_failed', error: 'ClamAV scan timed out.' })
    );
    socket.on('error', (error) =>
      settle({ ok: false, status: 'scan_failed', error: error.code || error.message })
    );
    socket.on('end', () => {
      const response = Buffer.concat(chunks).toString('utf8').trim();
      if (/FOUND\b/i.test(response)) {
        settle({ ok: true, response, status: 'infected' });
        return;
      }
      if (/\bOK\b/i.test(response)) {
        settle({ ok: true, response, status: 'clean' });
        return;
      }
      settle({
        ok: false,
        response,
        status: 'scan_failed',
        error: 'Unrecognized ClamAV response.',
      });
    });
  });

const result = {
  checks: {
    clean: await scanBuffer(cleanPayload),
    eicar: await scanBuffer(eicarPayload),
  },
  host,
  port,
};

result.passed =
  result.checks.clean.status === 'clean' &&
  result.checks.eicar.status === 'infected';

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.passed ? 0 : 1;
