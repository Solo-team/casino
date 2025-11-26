export class CanvasUtils {
  static roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  static drawTextWithShadow(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      shadowColor?: string;
      shadowBlur?: number;
      shadowOffsetX?: number;
      shadowOffsetY?: number;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
    } = {}
  ): void {
    const {
      fontSize = 16,
      fontFamily = "Arial",
      color = "#000",
      shadowColor = "rgba(0, 0, 0, 0.5)",
      shadowBlur = 4,
      shadowOffsetX = 2,
      shadowOffsetY = 2,
      align = "left",
      baseline = "top"
    } = options;

    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  static drawGradientRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    gradient: {
      type: "linear" | "radial";
      colors: Array<{ offset: number; color: string }>;
      x0?: number;
      y0?: number;
      x1?: number;
      y1?: number;
      r0?: number;
      r1?: number;
    }
  ): void {
    let grad: CanvasGradient;

    if (gradient.type === "linear") {
      grad = ctx.createLinearGradient(
        gradient.x0 ?? x,
        gradient.y0 ?? y,
        gradient.x1 ?? x + width,
        gradient.y1 ?? y + height
      );
    } else {
      const centerX = gradient.x0 ?? x + width / 2;
      const centerY = gradient.y0 ?? y + height / 2;
      grad = ctx.createRadialGradient(
        centerX,
        centerY,
        gradient.r0 ?? 0,
        centerX,
        centerY,
        gradient.r1 ?? Math.max(width, height) / 2
      );
    }

    gradient.colors.forEach(({ offset, color }) => {
      grad.addColorStop(offset, color);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);
  }

  static drawCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      radius?: number;
      shadow?: boolean;
      borderColor?: string;
      backgroundColor?: string;
    } = {}
  ): void {
    const {
      radius = 8,
      shadow = true,
      borderColor = "#1a1a1a",
      backgroundColor = "#ffffff"
    } = options;

    ctx.save();

    if (shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    }

    CanvasUtils.roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = backgroundColor;
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

