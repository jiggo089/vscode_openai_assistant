const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
const { NodeGlobalsPolyfillPlugin } = require('@esbuild-plugins/node-globals-polyfill');
const { NodeModulesPolyfillPlugin } = require('@esbuild-plugins/node-modules-polyfill');
const glob = require('glob');
const path = require('path');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

/**
 * This plugin hooks into the build process to print errors in a format that the problem matcher in
 * Visual Studio Code can understand.
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * Plugin to exclude sensitive files from the build process
 * @type {import('esbuild').Plugin}
 */
const excludeSensitiveFilesPlugin = {
	name: 'exclude-sensitive-files',
	setup(build) {
		build.onResolve({ filter: /openai\.key$/ }, args => {
			return { path: args.path, external: true };
		});
	}
};

/**
 * For web extension, all tests, including the test runner, need to be bundled into
 * a single module that has a exported `run` function .
 * This plugin bundles implements a virtual file extensionTests.ts that bundles all these together.
 * @type {import('esbuild').Plugin}
 */
const testBundlePlugin = {
	name: 'testBundlePlugin',
	setup(build) {
		build.onResolve({ filter: /[\/\\]extensionTests\.ts$/ }, args => {
			if (args.kind === 'entry-point') {
				return { path: path.resolve(args.path) };
			}
		});
		build.onLoad({ filter: /[\/\\]extensionTests\.ts$/ }, async args => {
			const testsRoot = path.join(__dirname, 'src/web/test/suite');
			const files = await glob.glob('*.test.{ts,tsx}', { cwd: testsRoot, posix: true });
			return {
				contents:
					`export { run } from './mochaTestRunner.ts';` +
					files.map(f => `import('./${f}');`).join(''),
				watchDirs: files.map(f => path.dirname(path.resolve(testsRoot, f))),
				watchFiles: files.map(f => path.resolve(testsRoot, f))
			};
		});
	}
};

const options = {
	entryPoints: ['src/web/extension.ts'],
	bundle: true,
	outfile: 'dist/web/extension.js',
	external: ['vscode', 'marked'],
	format: 'cjs',
	platform: 'browser',
	target: 'es2020',
	sourcemap: !isProduction,
	minify: isProduction,
	define: {
		'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
	},
	plugins: [
		nodeExternalsPlugin(),
		NodeModulesPolyfillPlugin(),
		NodeGlobalsPolyfillPlugin({
			process: true,
			buffer: true
		}),
		testBundlePlugin,
		excludeSensitiveFilesPlugin,
		esbuildProblemMatcherPlugin, /* add to the end of plugins array */
	]
};

async function build() {
	if (isWatch) {
		const context = await esbuild.context(options);
		await context.watch();
	} else {
		await esbuild.build(options);
	}
}

build().catch(() => process.exit(1));
