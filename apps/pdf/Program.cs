using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/render", (RenderRequest req) =>
{
    if (!string.Equals(req.TemplateKey, "ENCOUNTER_SUMMARY", StringComparison.Ordinal))
    {
        return Results.BadRequest(new
        {
            error = "unsupported_template",
            message = "Only ENCOUNTER_SUMMARY is supported in Phase 3A"
        });
    }

    if (req.Payload.ValueKind != JsonValueKind.Object)
    {
        return Results.BadRequest(new
        {
            error = "invalid_payload",
            message = "Payload must be a JSON object"
        });
    }

    var lines = new List<string>
    {
        "Vexel Health - Encounter Summary",
        $"Template Version: {req.TemplateVersion}",
        $"Payload Version: {req.PayloadVersion}",
        $"Encounter Code: {GetPayloadString(req.Payload, "encounterCode")}",
        $"Encounter Type: {GetPayloadString(req.Payload, "encounterType")}",
        $"Patient RegNo: {GetPayloadString(req.Payload, "patientRegNo")}",
        $"Patient Name: {GetPayloadString(req.Payload, "patientName")}",
        $"Status: {GetPayloadString(req.Payload, "encounterStatus")}",
    };

    var pdfBytes = BuildDeterministicPdf(lines);
    return Results.File(pdfBytes, "application/pdf");
});

app.Run();

static string GetPayloadString(JsonElement payload, string key)
{
    if (!payload.TryGetProperty(key, out var value))
    {
        return "-";
    }

    return value.ValueKind switch
    {
        JsonValueKind.String => ToAscii(value.GetString() ?? "-"),
        JsonValueKind.Number => ToAscii(value.GetRawText()),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        _ => "-",
    };
}

static string ToAscii(string input)
{
    if (string.IsNullOrEmpty(input))
    {
        return "-";
    }

    var builder = new StringBuilder(input.Length);
    foreach (var ch in input)
    {
        builder.Append(ch <= 127 ? ch : '?');
    }

    return builder.ToString();
}

static string EscapePdfText(string input)
{
    return input
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("(", "\\(", StringComparison.Ordinal)
        .Replace(")", "\\)", StringComparison.Ordinal);
}

static byte[] BuildDeterministicPdf(IReadOnlyList<string> lines)
{
    var contentBuilder = new StringBuilder();
    contentBuilder.Append("BT\n/F1 12 Tf\n50 780 Td\n");

    for (var i = 0; i < lines.Count; i++)
    {
        if (i > 0)
        {
            contentBuilder.Append("0 -18 Td\n");
        }

        contentBuilder.Append('(')
            .Append(EscapePdfText(lines[i]))
            .Append(") Tj\n");
    }

    contentBuilder.Append("ET");
    var content = contentBuilder.ToString();

    var objects = new List<string>
    {
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        $"5 0 obj\n<< /Length {Encoding.ASCII.GetByteCount(content)} >>\nstream\n{content}\nendstream\nendobj\n"
    };

    using var stream = new MemoryStream();
    var encoding = Encoding.ASCII;
    var offsets = new List<long> { 0 };

    WriteAscii(stream, "%PDF-1.4\n", encoding);

    foreach (var obj in objects)
    {
        offsets.Add(stream.Position);
        WriteAscii(stream, obj, encoding);
    }

    var xrefStart = stream.Position;
    WriteAscii(stream, $"xref\n0 {objects.Count + 1}\n", encoding);
    WriteAscii(stream, "0000000000 65535 f \n", encoding);

    for (var i = 1; i < offsets.Count; i++)
    {
        WriteAscii(stream, $"{offsets[i]:D10} 00000 n \n", encoding);
    }

    WriteAscii(stream, $"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\n", encoding);
    WriteAscii(stream, $"startxref\n{xrefStart}\n%%EOF\n", encoding);

    return stream.ToArray();
}

static void WriteAscii(Stream stream, string value, Encoding encoding)
{
    var bytes = encoding.GetBytes(value);
    stream.Write(bytes, 0, bytes.Length);
}

public record RenderRequest(
    string TemplateKey,
    int TemplateVersion,
    int PayloadVersion,
    JsonElement Payload
);
