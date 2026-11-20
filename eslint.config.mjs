import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [...nextVitals, { ignores: ['.test-dist/**'] }];
export default config;
