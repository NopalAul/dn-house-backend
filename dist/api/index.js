"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.PATCH = exports.PUT = exports.DELETE = exports.POST = exports.GET = exports.runtime = void 0;
const vercel_1 = require("hono/vercel");
// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line antfu/no-import-dist
const index_js_1 = __importDefault(require("../dist/src/index.js"));
exports.runtime = 'edge';
exports.GET = (0, vercel_1.handle)(index_js_1.default);
exports.POST = (0, vercel_1.handle)(index_js_1.default);
exports.DELETE = (0, vercel_1.handle)(index_js_1.default);
exports.PUT = (0, vercel_1.handle)(index_js_1.default);
exports.PATCH = (0, vercel_1.handle)(index_js_1.default);
exports.OPTIONS = (0, vercel_1.handle)(index_js_1.default);
exports.HEAD = (0, vercel_1.handle)(index_js_1.default);
