# ShuffleTab Development

`ShuffleTab` is a chrome extension that adds keyboard shortcuts for managing chrome tabs and windows.

## Breakdown
The two main components are: 
* Background `javascript` containing the extension logic.
* `Html` bootstrap-based popup.

### Background
Located in `js/background.js`, the functionality is split over the four keyboard shortcuts built into chrome extensions:
* `[Control+LEFT/RIGHT]`: Moves the current tab to the left or right respectively.
* `[Control+DOWN]`: Moves the selected (and optionally additional tabs) to a new window.
* `[Control+UP]`: Returns the selected tab to the window it was previously in.
