import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  NG_VALIDATORS,
  Validator,
} from "@angular/forms";
import { NpPopoverDirective } from "../np-popover/np-popover.directive";

@Component({
  selector: "np-rich-text",
  templateUrl: "./np-rich-text.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NpRichTextComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => NpRichTextComponent),
      multi: true,
    },
  ],
})
export class NpRichTextComponent implements ControlValueAccessor, Validator {
  private static controlCount = 1;

  @Input() minLength: number;
  @Input() maxLength: number;
  @Input() config: string[];
  @Input() fonts: string[];
  @Input() height: number;
  @Input() readOnly: boolean;
  @Input() autoFocus: boolean;
  @Input() tabIndex: number;
  @Input() styleClass: string;
  @Input() inputId: string = `np-rich-text_${NpRichTextComponent.controlCount++}`;
  @Output() onChange: EventEmitter<any> = new EventEmitter();
  @Output() onFocus: EventEmitter<any> = new EventEmitter();
  @Output() onBlur: EventEmitter<any> = new EventEmitter();

  @ViewChild("control") inputViewChild: ElementRef;
  @ViewChild("createLinkPopover") createLinkPopover: NpPopoverDirective;
  @ViewChild("foreColorPopover") foreColorPopover: NpPopoverDirective;
  @ViewChild("backColorPopover") backColorPopover: NpPopoverDirective;

  innerValue: string;
  isDisabled: boolean = false;
  focused: boolean = false;
  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  isBlockquote: boolean = false;
  isStrikethrough: boolean = false;
  currentFormat: string = "no value";
  currentFont: string = "no value";
  currentfontsize: string = "no value";
  linkUrl: string;
  currentSelectionRange: Range;
  foreColor: string;
  backColor: string;

  private onChangeCallback: (_: any) => void = () => { };
  private onTouchedCallback: () => void = () => { };

  constructor(private el: ElementRef) {
    this.config = [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "removeformat",
      "formatblock",
      "blockquote",
      "fontname",
      "fontsize",
      "forecolor",
      "backcolor",
      "subscript",
      "superscript",
      "justifyleft",
      "justifycenter",
      "justifyright",
      "indent",
      "outdent",
      "insertunorderedlist",
      "insertorderedlist",
      "createlink",
      "undo",
      "redo",
    ];
    this.fonts = ["Arial", "Arial Black", "Courier New", "Times New Roman"];
  }

  get value(): string {
    return this.innerValue ? this.innerValue : null;
  }

  set value(v: string) {
    if (v !== this.innerValue) {
      this.innerValue = v;
      this.onChangeCallback(v);
      this.onChange.emit(v);
    }
  }

  writeValue(v: string): void {
    if (v !== this.innerValue) {
      this.innerValue = v;
      if (this.inputViewChild && v) {
        this.inputViewChild.nativeElement.innerHTML = v;
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  validate(): any {
    var text = this.el.nativeElement.querySelector(".np-rich-text-input")
      .textContent;
    if (this.minLength !== undefined && text && text.length < this.minLength) {
      return {
        minLength: {
          valid: false,
        },
      };
    }
    if (this.maxLength !== undefined && text && text.length > this.maxLength) {
      return {
        maxLength: {
          valid: false,
        },
      };
    }
  }

  focus(): void {
    this.inputViewChild.nativeElement.focus();
  }

  _onInputChange(event: any): void {
    this.value = event.target.innerHTML;
  }

  _onBlur($event: any): void {
    this.focused = false;
    this.onTouchedCallback();
    this.onBlur.emit($event);
  }

  _onFocus($event: any): void {
    this.focused = true;
    this.onFocus.emit($event);
  }

  _formatDoc(sCmd: string, sValue: any): void {
    document.execCommand(sCmd, false, sValue);
    this.focus();
  }

  _formatBlock(sCmd: string, sValue: any): void {
    if (sValue === "no value") {
      return;
    }
    this._formatDoc(sCmd, sValue);
    setTimeout(() => {
      this.currentFormat = "no value";
      this.currentFont = "no value";
      this.currentfontsize = "no value";
    }, 100);
  }

  _showForeColorOverlay(): void {
    if (!this.focused) {
      this.focus();
    }
    if (document.getSelection() && document.getSelection().getRangeAt) {
      this.currentSelectionRange = document.getSelection().getRangeAt(0);
    }
    let colour = document.queryCommandValue("foreColor");
    if (colour.indexOf("rgb") > -1) {
      colour = this._changeRGBToHex(colour);
    }
    if (colour.indexOf("transparent") > -1) {
      colour = null;
    }
    this.foreColor = colour;
  }

  _changeForeColor(color: any): void {
    if (this.currentSelectionRange) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(this.currentSelectionRange);
      this.foreColor = color;
      if (color) {
        this._formatDoc("foreColor", color);
      } else {
        document.execCommand("removeformat", false, "foreColor");
      }
      this.currentSelectionRange = null;
    }
    this.foreColorPopover.close();
  }

  _showBackColorOverlay(): void {
    if (!this.focused) {
      this.focus();
    }
    if (document.getSelection() && document.getSelection().getRangeAt) {
      this.currentSelectionRange = document.getSelection().getRangeAt(0);
    }
    let colour = document.queryCommandValue("backColor");
    if (colour.indexOf("rgb") > -1) {
      colour = this._changeRGBToHex(colour);
    }
    if (colour.indexOf("transparent") > -1) {
      colour = null;
    }
    this.backColor = colour;
  }

  _changeBackColor(color: any): void {
    if (this.currentSelectionRange) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(this.currentSelectionRange);
      this.backColor = color;
      if (color) {
        this._formatDoc("backColor", color);
      } else {
        document.execCommand("removeformat", false, "backColor");
      }
      this.currentSelectionRange = null;
    }
    this.backColorPopover.close();
  }

  _onCloseOverlays(): void {
    if (this.currentSelectionRange) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(this.currentSelectionRange);
      this.currentSelectionRange = null;
    }
    this.focus();
  }

  _showCreateLink(): void {
    if (!this.focused) {
      this.focus();
    }
    if (document.getSelection() && document.getSelection().getRangeAt) {
      this.currentSelectionRange = document.getSelection().getRangeAt(0);
    }
    this.linkUrl = "https://";
  }

  _createLink(): void {
    if (this.currentSelectionRange) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(this.currentSelectionRange);
      if (this.linkUrl) {
        this._formatDoc("createlink", this.linkUrl);
      }
      this.currentSelectionRange = null;
    }
    this.createLinkPopover.close();
  }

  _closeCreateLinkOverlay(): void {
    this.createLinkPopover.close();
  }

  _changeRGBToHex(val: any): string {
    const rgb = val
      .replace("rgb", "")
      .replace("rgba", "")
      .replace("(", "")
      .replace(")", "")
      .replace(" ", "");
    const rgbAray = rgb.split(",");
    return this._rgbToHex(
      Number(rgbAray[0]),
      Number(rgbAray[1]),
      Number(rgbAray[2])
    );
  }

  _rgbToHex(r: any, g: any, b: any): string {
    const red = this._convertNumberToHex(r);
    const green = this._convertNumberToHex(g);
    const blue = this._convertNumberToHex(b);
    return `#${red}${green}${blue}`;
  }

  _convertNumberToHex(num: any): string {
    let hex = Number(num).toString(16);
    if (hex.length < 2) {
      hex = `0${hex}`;
    }
    return hex;
  }

  _isAllowed(permission: string): boolean {
    return this.config.indexOf(permission) > -1;
  }
}
