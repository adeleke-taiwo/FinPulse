import { prisma } from "@/lib/db";
import { requirePermission, isAuthError } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requirePermission("transactions", "view");
  if (isAuthError(authResult)) return authResult;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = "";
      let closed = false;

      function safeEnqueue(chunk: Uint8Array) {
        if (!closed) {
          try {
            controller.enqueue(chunk);
          } catch {
            closed = true;
          }
        }
      }

      function safeClose() {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }

      async function poll() {
        if (closed) return;
        try {
          const where = lastId
            ? { id: { not: lastId }, createdAt: { gte: new Date(Date.now() - 60000) } }
            : { createdAt: { gte: new Date(Date.now() - 60000) } };

          const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              category: { select: { name: true } },
              fromAccount: { select: { accountNumber: true } },
            },
          });

          if (transactions.length > 0) {
            lastId = transactions[0].id;
            const data = transactions.map((tx) => ({
              id: tx.id,
              type: tx.type,
              amount: Number(tx.amount),
              category: tx.category?.name || "Unknown",
              account: tx.fromAccount?.accountNumber?.slice(-4) || "****",
              occurredAt: tx.occurredAt,
            }));

            safeEnqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }
        } catch {
          // Silently handle polling errors
        }
      }

      // Initial data
      await poll();

      // Poll every 5 seconds
      const interval = setInterval(poll, 5000);

      // Cleanup on close
      const timeout = setTimeout(() => {
        clearInterval(interval);
        safeClose();
      }, 300000); // 5 min max

      // Handle client disconnect
      safeEnqueue(encoder.encode(": keepalive\n\n"));

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
