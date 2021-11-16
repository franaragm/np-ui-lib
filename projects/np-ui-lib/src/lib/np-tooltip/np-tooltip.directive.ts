import {
  Directive,
  Input,
  AfterViewInit,
  ComponentRef,
  ElementRef,
  TemplateRef,
  OnDestroy,
} from "@angular/core";
import {
  OverlayRef,
  Overlay,
  OverlayPositionBuilder,
  ConnectedPosition,
} from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { NpTooltipComponent } from "./np-tooltip.component";
import { NpUtilityService } from "../np-utility/np-utility.service";

@Directive({
  selector: "[npTooltip]",
})
export class NpTooltipDirective implements AfterViewInit, OnDestroy {
  @Input("npTooltip") text: string | TemplateRef<any>;
  @Input() placement: string;
  @Input() context: any;
  @Input() width: number;
  @Input() styleClass: string;
  @Input() tooltipOnFocus = false;

  private overlayRef: OverlayRef;

  mouseEnterListener: () => void = () => { };
  mouseLeaveListener: () => void = () => { };
  focusListener: () => void = () => { };
  blurListener: () => void = () => { };

  constructor(
    private overlay: Overlay,
    private overlayPositionBuilder: OverlayPositionBuilder,
    private elementRef: ElementRef,
    private utility: NpUtilityService
  ) { }

  ngAfterViewInit(): void {
    this.elementRef.nativeElement.className = `${this.elementRef.nativeElement.className} np-tooltip-target`.trim();
    const position: ConnectedPosition[] = this.utility.getPosition(
      this.placement
    );
    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions(position);
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    if (this.tooltipOnFocus) {
      this.focusListener = this._show.bind(this);
      this.blurListener = this._hide.bind(this);
      this.elementRef.nativeElement.addEventListener(
        "focus",
        this.focusListener
      );
      this.elementRef.nativeElement.addEventListener("blur", this.blurListener);
    } else {
      this.mouseEnterListener = this._show.bind(this);
      this.mouseLeaveListener = this._hide.bind(this);
      this.elementRef.nativeElement.addEventListener(
        "mouseover",
        this.mouseEnterListener
      );
      this.elementRef.nativeElement.addEventListener(
        "mouseout",
        this.mouseLeaveListener
      );
    }
  }

  ngOnDestroy(): void {
    if (this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }
  }

  _show(): void {
    const tooltipPortal = new ComponentPortal(NpTooltipComponent);
    const tooltipRef: ComponentRef<NpTooltipComponent> = this.overlayRef.attach(
      tooltipPortal
    );
    tooltipRef.instance.tooltip = this.text;
    tooltipRef.instance.context = this.context;
    tooltipRef.instance.width = this.width;
    tooltipRef.instance.styleClass = this.styleClass;
  }

  _hide(): void {
    if (this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }
  }
}
