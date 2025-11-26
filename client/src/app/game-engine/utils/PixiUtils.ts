import * as PIXI from "pixi.js";

export class PixiUtils {
  static createRoundedRect(
    graphics: PIXI.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: number,
    alpha: number = 1
  ): void {
    graphics.beginFill(color, alpha);
    graphics.drawRoundedRect(x, y, width, height, radius);
    graphics.endFill();
  }

  static createGradientRect(
    graphics: PIXI.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    colors: number[],
    alpha: number = 1
  ): void {
    const gradient = new PIXI.Graphics();
    gradient.beginFill(colors[0], alpha);
    gradient.drawRoundedRect(x, y, width, height, radius);
    gradient.endFill();
    graphics.addChild(gradient);
  }

  static createText(
    text: string,
    style: Partial<PIXI.TextStyle> = {}
  ): PIXI.Text {
    const defaultStyle: Partial<PIXI.TextStyle> = {
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0xffffff,
      align: "center"
    };

    return new PIXI.Text(text, { ...defaultStyle, ...style });
  }

  static createCard(
    graphics: PIXI.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    backgroundColor: number,
    borderColor: number
  ): PIXI.Graphics {
    const card = new PIXI.Graphics();
    card.beginFill(backgroundColor);
    card.lineStyle(2, borderColor);
    card.drawRoundedRect(x, y, width, height, radius);
    card.endFill();
    return card;
  }

  static createChip(
    graphics: PIXI.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number
  ): PIXI.Graphics {
    const chip = new PIXI.Graphics();
    chip.beginFill(color);
    chip.drawCircle(x, y, radius);
    chip.endFill();
    chip.lineStyle(3, 0xffffff, 0.6);
    chip.drawCircle(x, y, radius);
    chip.lineStyle(2, 0x000000, 0.3);
    chip.drawCircle(x, y, radius);
    return chip;
  }
}

