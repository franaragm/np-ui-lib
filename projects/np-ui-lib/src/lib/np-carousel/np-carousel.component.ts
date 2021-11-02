import {
  Component,
  Input,
  OnDestroy,
  TemplateRef,
  HostListener,
  AfterContentInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from "@angular/core";

@Component({
  selector: "np-carousel",
  templateUrl: "./np-carousel.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class NpCarouselComponent
  implements AfterContentInit, OnDestroy, OnChanges {
  private static controlCount = 1;

  @Input() items: any[] = [];
  @Input() lazyLoaded: boolean;
  @Input() autoPlay: boolean;
  @Input() autoPlayInterval = 5000;
  @Input() itemTemplate: TemplateRef<any>;
  @Input() visibleNum = 1;
  @Input() scrollNum = 1;
  @Input() currentPage = 0;
  @Input() pauseOnHover: boolean;
  @Input() showNavigationArrows = true;
  @Input() showNavigationIndicators = true;
  @Input() styleClass: string;
  @Input() inputId = `np-carousel_${NpCarouselComponent.controlCount++}`;

  interval: any;
  startIdx: number;
  endIdx: number;
  isPolite = false;

  @HostListener("mouseenter")
  _onMouseEnter() {
    if (this.pauseOnHover) {
      this.pause();
    }
  }

  @HostListener("mouseleave")
  _onMouseLeave() {
    if (this.pauseOnHover) {
      this.start();
    }
  }

  pause() {
    if (this.autoPlay) {
      clearInterval(this.interval);
      this.isPolite = true;
    }
  }

  start() {
    if (this.autoPlay) {
      this._setAutoSlideChange();
    }
  }

  select(page: number) {
    this._goToPage(page);
  }

  ngOnDestroy(): void {
    if (this.autoPlay) {
      clearInterval(this.interval);
      this.isPolite = true;
    }
  }

  ngAfterContentInit(): void {
    this._getSlidesFromPage();
    if (this.autoPlay) {
      this._setAutoSlideChange();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.scrollNum || changes.visibleNum) {
      this._getSlidesFromPage();
    }
  }

  _totalPages() {
    if (this.items === undefined || this.items === null) {
      return 0;
    }
    return Math.ceil(
      (this.items.length - this.visibleNum + this.scrollNum) / this.scrollNum
    );
  }

  _getSlidesFromPage() {
    this.startIdx = this.currentPage * this.scrollNum;
    this.endIdx = this.startIdx + this.visibleNum - 1;
  }

  _plusSlides() {
    const idx = this.currentPage + 1;
    this.currentPage = idx >= this._totalPages() ? 0 : idx;
    this._getSlidesFromPage();
  }

  _minusSlides() {
    const idx = this.currentPage - 1;
    this.currentPage = idx < 0 ? this._totalPages() - 1 : idx;
    this._getSlidesFromPage();
  }

  _setAutoSlideChange() {
    this.interval = setInterval(() => {
      this._plusSlides();
    }, this.autoPlayInterval);
    this.isPolite = false;
  }

  _goToPage(page: number) {
    this.currentPage = page;
    this._getSlidesFromPage();
  }

  _getEmptyArray(i: number) {
    return new Array(i);
  }

  _isActive(idx: number) {
    if (this.lazyLoaded || (idx >= this.startIdx && idx <= this.endIdx)) {
      return true;
    }
    return false;
  }

  _getActiveItems() {
    if (!this.items || !this.lazyLoaded) {
      return this.items;
    }
    return this.items.slice(this.startIdx, this.endIdx + 1);
  }

  _getIdxOfItem(i: number) {
    if (!this.lazyLoaded) {
      return i + 1 + ' of ' + this.items.length;
    }
    return this.startIdx + i + 1 + ' of ' + this.items.length;
  }

  _trackBy(index: number): number {
    return index;
  }
}
