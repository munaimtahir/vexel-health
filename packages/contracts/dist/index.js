"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.createVexelClient = void 0;
const openapi_fetch_1 = __importDefault(require("openapi-fetch"));
const createVexelClient = (options) => (0, openapi_fetch_1.default)(options);
exports.createVexelClient = createVexelClient;
exports.client = (0, exports.createVexelClient)({ baseUrl: 'http://localhost:3000' });
//# sourceMappingURL=index.js.map