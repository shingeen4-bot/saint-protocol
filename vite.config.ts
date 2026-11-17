import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A relative base permits project pages at /repository-name/ and local preview.
export default defineConfig({ plugins: [react()], base: './' });
