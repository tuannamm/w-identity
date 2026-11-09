/**
 * BẢN COPY hợp đồng gateway ↔ service.
 * Nguồn chuẩn: apps/api-gateway/src/gateway/contracts.ts. Đổi ở đó thì cập nhật ở đây.
 */

export interface GatewayUser {
  sub: string;
  [claim: string]: unknown;
}

export interface GatewayRequest<TBody = unknown> {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: TBody;
  user?: GatewayUser;
  meta: {
    requestId: string;
    operationId: string;
    project: string;
    idempotencyKey?: string;
  };
}

export interface GatewayRpcError {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
}

/** Internal RPC: request uses GatewayRequest.params.id; no Actor or HTTP route. */
export interface ResolvePermissionsResponse {
  permissions: string[];
}
