import {
  Component,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from "@angular/core";
import { NpMenuItem } from "../np-menu.model";
import { Router } from "@angular/router";

@Component({
  selector: "np-menu-item",
  templateUrl: "./np-menu-item.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class NpMenuItemComponent {
  @Input() item: NpMenuItem;
  @Input() orientation: "vertical" | "horizontal" = "vertical";

  @Output() onClickItem: EventEmitter<any> = new EventEmitter();

  constructor(private router: Router) { }

  _onMouseEnter($event: any, item: NpMenuItem): void {
    if (this.orientation === "vertical") {
      item.x = $event.target.offsetWidth;
      item.y = 0;
    } else {
      item.x = 0;
      item.y = $event.target.offsetHeight;
    }
    item.isChildVisible = true;
  }

  _onMouseLeave(item: NpMenuItem): void {
    item.isChildVisible = false;
  }

  _onClickMenuItem(item: NpMenuItem): void {
    this.onClickItem.emit(item);
  }

  _isActive(item: NpMenuItem): boolean {
    return this.router.isActive(item.routerLink, { matrixParams: 'ignored', queryParams: 'ignored', paths: 'subset', fragment: 'ignored' });
  }
}
