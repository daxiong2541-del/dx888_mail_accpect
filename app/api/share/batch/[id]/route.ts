import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchRegistration from '@/models/BatchRegistration';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'json'; // json or html

    const task = await BatchRegistration.findById(id);

    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    if (type === 'html') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Batch Registration Result</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 800px; mx-auto; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .status-success { color: green; }
            .status-failed { color: red; }
          </style>
        </head>
        <body>
          <h1>Batch Result (${task.count} accounts)</h1>
          <p>Type: ${task.charType}</p>
          <p>Status: ${task.status}</p>
          
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Password</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${task.generatedAccounts.map((acc: { email?: string; password?: string; status?: string }) => `
                <tr>
                  <td>${acc.email}</td>
                  <td style="font-family: monospace">${acc.password || '-'}</td>
                  <td class="status-${acc.status === 'success' || !acc.status ? 'success' : 'failed'}">
                    ${acc.status || 'success'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return NextResponse.json({
        success: true,
        task: {
            count: task.count,
            charType: task.charType,
            status: task.status,
            accounts: task.generatedAccounts
        }
      });
    }

  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
