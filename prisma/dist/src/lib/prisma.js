"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
function getPrismaClient() {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new client_1.PrismaClient();
    }
    return globalForPrisma.prisma;
}
exports.prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        return Reflect.get(getPrismaClient(), prop, receiver);
    },
});
