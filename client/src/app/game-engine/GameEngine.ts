export interface GameConfig {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface Drawable {
  draw(ctx: CanvasRenderingContext2D): void;
  update?(deltaTime: number): void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private objects: Drawable[] = [];
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context from canvas");
    }
    this.ctx = context;
    
    this.setupCanvas(config);
  }

  private setupCanvas(config: GameConfig): void {
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.canvas.style.width = `${config.width}px`;
    this.canvas.style.height = `${config.height}px`;
    
    if (config.backgroundColor) {
      this.canvas.style.backgroundColor = config.backgroundColor;
    }
  }

  addObject(obj: Drawable): void {
    this.objects.push(obj);
  }

  removeObject(obj: Drawable): void {
    const index = this.objects.indexOf(obj);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  clearObjects(): void {
    this.objects = [];
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (currentTime: number = performance.now()): void => {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.objects.forEach(obj => {
      if (obj.update) {
        obj.update(deltaTime);
      }
      obj.draw(this.ctx);
    });

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  destroy(): void {
    this.stop();
    this.clearObjects();
  }
}

