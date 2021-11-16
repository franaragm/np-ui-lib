import { NgModule, Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "npHighlight",
})
export class NpHighlightPipe implements PipeTransform {
  transform(text: string, search: string): string {
    if (search && text) {
      let pattern = search.replace(
        /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
        "\\$&"
      );
      pattern = pattern
        .split(" ")
        .filter((t) => {
          return t.length > 0;
        })
        .join("|");
      const regex = new RegExp(pattern, "gi");
      return text.replace(
        regex,
        (match) => `<span class="np-highlight">${match}</span>`
      );
    } else {
      return text;
    }
  }
}

@NgModule({
  declarations: [NpHighlightPipe],
  exports: [NpHighlightPipe],
})
export class NpHighlightModule { }
