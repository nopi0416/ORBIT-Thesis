import cors from 'cors';

const isNgrokOrigin = (origin = '') => {
  try {
    const parsed = new URL(origin);
    return parsed.hostname.endsWith('.ngrok-free.dev') || parsed.hostname.endsWith('.ngrok.io');
  } catch {
    return false;
  }
};

const getAllowedOrigins = () => {
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://orbit-deployment.vercel.app',
  ];
  
  return [...new Set([...envOrigins, ...defaultOrigins])];
};

const allowedOrigins = getAllowedOrigins();
const allowNgrokOrigins =
  String(process.env.ALLOW_NGROK_ORIGINS || '').toLowerCase() === 'true' ||
  process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (allowNgrokOrigins && isNgrokOrigin(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin not allowed - ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

export const corsMiddleware = cors(corsOptions);

export default corsOptions;
