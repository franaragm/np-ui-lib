import {
  Component,
  Input,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  TemplateRef,
  OnInit,
} from "@angular/core";

@Component({
  templateUrl: "./np-tooltip.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class NpTooltipComponent implements OnInit {
  private static controlCount = 1;

  @Input() tooltip: string | TemplateRef<any>;
  @Input() context: any;
  @Input() width: number;
  @Input() styleClass: string;
  @Input() inputId: string = `np-tooltip_${NpTooltipComponent.controlCount++}`;

  isTemplate: boolean;

  ngOnInit(): void {
    if (this.tooltip instanceof TemplateRef) {
      this.isTemplate = true;
    }
  }
}
