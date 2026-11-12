# Homepage Parity Comparison: local-final

Reference: https://krawlthroughkrakow.com/about-us/how-to-join/
Candidate: http://127.0.0.1:5185/

Geometry tolerance: 1px. Pixel threshold: 0.50% changed pixels.
Only third-party iframe rectangles and the Iubenda floating consent control are masked in pixels. Their document boxes still participate in geometry checks. No page content, navigation, text, photos, animation slides or section spacing is masked.

## Summary

```json
{
  "viewports": 4,
  "contentDifferences": 0,
  "geometryDifferences": 80,
  "typographyDifferences": 0,
  "screenshotComparisons": 24,
  "screenshotsWithinTolerance": 19,
  "errors": 1
}
```

## Screenshot Differences

| Image | Changed pixels | Ratio | Dimensions |
| --- | ---: | ---: | --- |
| viewport-1920 | 120 | 0.006% | 1920x1080 / 1920x1080 |
| tile-1920-00 | 120 | 0.006% | 1920x1080 / 1920x1080 |
| tile-1920-01 | 0 | 0.000% | 1920x1080 / 1920x1080 |
| tile-1920-02 | 0 | 0.000% | 1920x1080 / 1920x1080 |
| tile-1920-03 | 13 | 0.001% | 1920x1080 / 1920x1080 |
| viewport-1440 | 147969 | 11.430% | 1440x900 / 1440x900 |
| tile-1440-00 | 147969 | 11.430% | 1440x900 / 1440x900 |
| tile-1440-01 | 102534 | 7.920% | 1440x900 / 1440x900 |
| tile-1440-02 | 72661 | 7.874% | 1440x900 / 1440x900 |
| tile-1440-03 | 91474 | 26.061% | 1440x900 / 1440x900 |
| tile-1440-04 | 13 | 0.002% | 1440x900 / 1440x900 |
| viewport-768 | 120 | 0.015% | 768x1024 / 768x1024 |
| tile-768-00 | 120 | 0.015% | 768x1024 / 768x1024 |
| tile-768-01 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-02 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-03 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-04 | 0 | 0.000% | 768x1024 / 768x1024 |
| viewport-390 | 120 | 0.037% | 390x844 / 390x844 |
| tile-390-00 | 120 | 0.037% | 390x844 / 390x844 |
| tile-390-01 | 74 | 0.031% | 390x844 / 390x844 |
| tile-390-02 | 0 | 0.000% | 390x844 / 390x844 |
| tile-390-03 | 0 | 0.000% | 390x844 / 390x844 |
| tile-390-04 | 0 | 0.000% | 390x844 / 390x844 |
| tile-390-05 | 0 | 0.000% | 390x844 / 390x844 |

## First Geometry Differences

```json
[
  {
    "width": 1440,
    "identity": "headers[0] main-header",
    "property": "height",
    "expected": 187,
    "actual": 140,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "headerLinks[0] A",
    "property": "y",
    "expected": 82.734375,
    "actual": 59.234375,
    "delta": -23.5
  },
  {
    "width": 1440,
    "identity": "headerLinks[0] A",
    "property": "width",
    "expected": 107.546875,
    "actual": 80.515625,
    "delta": -27.03125
  },
  {
    "width": 1440,
    "identity": "headerLinks[1] A",
    "property": "x",
    "expected": 110,
    "actual": 84.671875,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[1] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[2] A",
    "property": "x",
    "expected": 251.375,
    "actual": 226.046875,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[2] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[3] A",
    "property": "x",
    "expected": 383.578125,
    "actual": 358.25,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[3] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[4] A",
    "property": "x",
    "expected": 584.875,
    "actual": 559.546875,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[4] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[5] A",
    "property": "x",
    "expected": 744.3125,
    "actual": 718.984375,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[5] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[6] A",
    "property": "x",
    "expected": 863.703125,
    "actual": 838.375,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[6] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[7] A",
    "property": "x",
    "expected": 958.953125,
    "actual": 933.625,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[7] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[8] A",
    "property": "x",
    "expected": 1094.875,
    "actual": 1069.546875,
    "delta": -25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[8] A",
    "property": "y",
    "expected": 33,
    "actual": 74,
    "delta": 41
  },
  {
    "width": 1440,
    "identity": "headerLinks[9] A",
    "property": "x",
    "expected": 110,
    "actual": 1230.8125,
    "delta": 1120.8125
  },
  {
    "width": 1440,
    "identity": "headerLinks[9] A",
    "property": "y",
    "expected": 80,
    "actual": 33,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "headerImages[0] logo",
    "property": "y",
    "expected": 51.421875,
    "actual": 38.5,
    "delta": -12.921875
  },
  {
    "width": 1440,
    "identity": "headerImages[0] logo",
    "property": "width",
    "expected": 107.546875,
    "actual": 80.515625,
    "delta": -27.03125
  },
  {
    "width": 1440,
    "identity": "headerImages[0] logo",
    "property": "height",
    "expected": 84.140625,
    "actual": 63,
    "delta": -21.140625
  },
  {
    "width": 1440,
    "identity": "textSamples[0] H1",
    "property": "y",
    "expected": 287,
    "actual": 240,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "textSamples[1] P",
    "property": "y",
    "expected": 359.671875,
    "actual": 312.671875,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "textSamples[2] P",
    "property": "y",
    "expected": 429.078125,
    "actual": 382.078125,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "textSamples[3] et_pb_module_header",
    "property": "y",
    "expected": 667.078125,
    "actual": 620.078125,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "textSamples[4] P",
    "property": "y",
    "expected": 698.078125,
    "actual": 651.078125,
    "delta": -47
  },
  {
    "width": 1440,
    "identity": "textSamples[5] et_pb_module_header",
    "property": "y",
    "expected": 667.078125,
    "actual": 620.078125,
    "delta": -47
  }
]
```

All content, typography, geometry and pixel details are in the matching comparison JSON. Differences are reported, not automatically corrected.