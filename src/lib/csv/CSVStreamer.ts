export interface CsvColumn<Row extends Record<string, unknown>> {
  header: string;
  key: keyof Row & string;
  formatter?: (value: Row[keyof Row]) => string;
}

export interface CSVStreamerOptions<Row extends Record<string, unknown>> {
  columns: CsvColumn<Row>[];
  delimiter?: string;
  includeHeader?: boolean;
  onRow?: (count: number) => void;
}

export class CSVStreamer {
  static async streamToFile<Row extends Record<string, unknown>>(
    rowGenerator: AsyncGenerator<Row>,
    filename: string,
    options: CSVStreamerOptions<Row>
  ): Promise<void> {
    const blob = await CSVStreamer.streamToBlob(rowGenerator, options);
    await CSVStreamer.presentBlob(blob, filename);
  }

  private static async streamToBlob<Row extends Record<string, unknown>>(
    rowGenerator: AsyncGenerator<Row>,
    options: CSVStreamerOptions<Row>
  ): Promise<Blob> {
    const { columns, delimiter = ",", includeHeader = true } = options;
    const encoder = new TextEncoder();
    const iterator = rowGenerator[Symbol.asyncIterator]();
    let rowCount = 0;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (includeHeader) {
          controller.enqueue(
            encoder.encode(
              CSVStreamer.buildHeader(columns, delimiter)
            )
          );
        }
      },
      async pull(controller) {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }

        rowCount += 1;
        controller.enqueue(
          encoder.encode(
            CSVStreamer.buildRow(value, columns, delimiter)
          )
        );
        options.onRow?.(rowCount);
      },
      cancel() {
        iterator.return?.();
      },
    });

    const response = new Response(stream);
    return response.blob();
  }

  private static async presentBlob(blob: Blob, filename: string) {
    const file = new File([blob], filename, { type: "text/csv" });

    if (
      navigator.share &&
      navigator.canShare?.({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "Your Gym Mate export",
        });
        return;
      } catch (error) {
        console.warn("[CSVStreamer] Share aborted:", error);
      }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private static buildHeader<Row extends Record<string, unknown>>(
    columns: CsvColumn<Row>[],
    delimiter: string
  ): string {
    return (
      columns
        .map((column) => CSVStreamer.escapeCell(column.header))
        .join(delimiter) + "\r\n"
    );
  }

  private static buildRow<Row extends Record<string, unknown>>(
    row: Row,
    columns: CsvColumn<Row>[],
    delimiter: string
  ): string {
    return (
      columns
        .map((column) => {
          const raw = row[column.key];
          const formatted =
            column.formatter?.(raw) ??
            CSVStreamer.stringifyValue(raw);
          return CSVStreamer.escapeCell(formatted);
        })
        .join(delimiter) + "\r\n"
    );
  }

  private static stringifyValue(value: unknown): string {
    if (value == null) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return JSON.stringify(value);
  }

  private static escapeCell(value: string): string {
    const needsQuotes = /["\r\n,]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }
}
