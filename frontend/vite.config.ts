import { publicEnvironment, environmentDefines, readProjectVersion } from './config/project.mjs'
import {dirname, relative, resolve} from 'path'
import type {ConfigEnv, UserConfig} from 'vite'
import {loadEnv, normalizePath} from 'vite'
import {createVitePlugins} from './build/vite'
import {exclude, include} from "./build/vite/optimize"
// 当前执行node命令时文件夹的地址(工作目录)
const root = process.cwd()

// 路径查找
function pathResolve(dir: string) {
    return resolve(root, '.', dir)
}

function getRelativeScssUsePath(filename: string, targetPath: string) {
    const cleanFilename = filename.split('?')[0]
    const relativePath = normalizePath(relative(dirname(cleanFilename), targetPath))
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

// https://vitejs.dev/config/
export default ({command, mode}: ConfigEnv): UserConfig => {
    const isBuild = command === 'build'
    const env = publicEnvironment(loadEnv(mode, root), readProjectVersion())
    const target = loadEnv(mode, root, 'RAIN_').RAIN_PROXY_TARGET || 'http://127.0.0.1:48080'
    const proxy = {
        [env.VITE_API_URL]: { target, changeOrigin: true },
        '/infra/ws': { target, changeOrigin: true, ws: true }
    }
    const variablesScssPath = pathResolve('src/styles/variables.scss')
    return {
        base: env.VITE_BASE_PATH,
        root: root,
        define: environmentDefines(env),
        preview: { host: '127.0.0.1', proxy },
        // 服务端渲染
        server: {
            port: Number(env.VITE_PORT), // 端口号
            host: "0.0.0.0",
            open: env.VITE_OPEN === 'true',
            proxy,
        },
        // 项目使用的vite插件。 单独提取到build/vite/plugin中管理
        plugins: [...createVitePlugins(isBuild, env), {
            name: 'rain-erp-version',
            generateBundle() {
                this.emitFile({ type: 'asset', fileName: 'version.json',
                    source: JSON.stringify({ name: 'Rain-erp', version: env.VITE_APP_VERSION }) + '\n' })
            }
        }],
        css: {
            lightningcss: {
                // Preserve legacy star-hack declarations by stripping invalid syntax during minification.
                errorRecovery: true
            },
            preprocessorOptions: {
                scss: {
                    additionalData: (source: string, filename: string) => {
                        const normalizedFilename = normalizePath(filename)
                        // Windows 下更容易触发重复注入：定义或显式转导变量的文件，不能再次注入同一个
                        // `@use ... as *`，否则 Sass 会报 duplicate global variables。
                        if (
                            normalizedFilename.endsWith('/src/styles/variables.scss') ||
                            normalizedFilename.endsWith('/src/styles/global.module.scss')
                        ) {
                            return source
                        }
                        return `@use "${getRelativeScssUsePath(filename, variablesScssPath)}" as *;\n${source}`
                    },
                    api: 'modern-compiler'
                }
            }
        },
        resolve: {
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
            alias: [
                {
                    find: /\@\//,
                    replacement: `${pathResolve('src')}/`
                }
            ]
        },
        build: {
            chunkSizeWarningLimit: 2000,
            minify: 'oxc',
            outDir: env.VITE_OUT_DIR || 'dist',
            reportCompressedSize: false,
            sourcemap: env.VITE_SOURCEMAP === 'true' ? 'inline' : false,
            rollupOptions: {
                output: {
                    minify: {
                        compress: {
                            dropDebugger: env.VITE_DROP_DEBUGGER === 'true',
                            dropConsole: env.VITE_DROP_CONSOLE === 'true'
                        }
                    },
                    codeSplitting: {
                        groups: [
                            { name: 'echarts', test: /node_modules[\\/]echarts[\\/]/ }, // 将 echarts 单独打包，参考 https://gitee.com/yudaocode/yudao-ui-admin-vue3/issues/IAB1SX 讨论
                            { name: 'form-create', test: /node_modules[\\/]@form-create[\\/]element-ui[\\/]/ }, // 参考 https://github.com/yudaocode/yudao-ui-admin-vue3/issues/148 讨论
                            { name: 'form-designer', test: /node_modules[\\/]@form-create[\\/]designer[\\/]/ }
                        ]
                    }
                },
            },
        },
        optimizeDeps: {include, exclude}
    }
}
