# Homepage Parity Comparison: local-controlled

Reference: https://krawlthroughkrakow.com/
Candidate: http://127.0.0.1:5184/

Geometry tolerance: 1px. Pixel threshold: 0.50% changed pixels.
Only third-party iframe rectangles and the Iubenda floating consent control are masked in pixels. Their document boxes still participate in geometry checks. No page content, navigation, text, photos, animation slides or section spacing is masked.

## Summary

```json
{
  "viewports": 4,
  "contentDifferences": 0,
  "geometryDifferences": 1,
  "typographyDifferences": 0,
  "screenshotComparisons": 30,
  "screenshotsWithinTolerance": 23,
  "errors": 0
}
```

## Screenshot Differences

| Image | Changed pixels | Ratio | Dimensions |
| --- | ---: | ---: | --- |
| viewport-1920 | 0 | 0.000% | 1920x1080 / 1920x1080 |
| section-1920-00 | 1153 | 0.052% | 1920x1145 / 1920x1145 |
| section-1920-01 | 592 | 0.020% | 1920x1554 / 1920x1554 |
| section-1920-02 | 3592 | 0.401% | 1920x467 / 1920x467 |
| section-1920-03 | 6305 | 0.119% | 1920x2769 / 1920x2769 |
| section-1920-04 | 0 | 0.000% | 1920x185 / 1920x185 |
| section-1920-05 | 6305 | 0.280% | 1920x1173 / 1920x1173 |
| section-1920-06 | 4461 | 0.329% | 1920x707 / 1920x707 |
| section-1920-07 | 717 | 0.241% | 1920x155 / 1920x155 |
| section-1920-08 | 6305 | 0.414% | 1920x943 / 1920x943 |
| section-1920-09 | 0 | 0.000% | 1920x233 / 1920x233 |
| section-1920-10 | 860 | 0.098% | 1920x619 / 1920x619 |
| section-1920-11 | 6049 | 0.482% | 1920x653 / 1920x653 |
| section-1920-12 | 1363 | 0.210% | 1920x338 / 1920x338 |
| viewport-1440 | 0 | 0.000% | 1440x900 / 1440x900 |
| viewport-768 | 179 | 0.023% | 768x1024 / 768x1024 |
| viewport-390 | 193 | 0.059% | 390x844 / 390x844 |
| section-390-00 | 0 | 0.000% | 390x233 / 390x233 |
| section-390-01 | 11723 | 1.314% | 390x2292 / 390x2292 |
| section-390-02 | 6641 | 3.710% | 390x459 / 390x459 |
| section-390-03 | 6927 | 0.467% | 390x3806 / 390x3806 |
| section-390-04 | 189 | 0.246% | 390x197 / 390x197 |
| section-390-05 | 67741 | 8.552% | 390x2031 / 390x2031 |
| section-390-06 | 0 | 0.000% | 390x1276 / 390x1276 |
| section-390-07 | 34 | 0.101% | 390x86 / 390x86 |
| section-390-08 | 15709 | 2.528% | 390x1717 / 390x1717 |
| section-390-09 | 9448 | 8.022% | 390x302 / 390x302 |
| section-390-10 | 0 | 0.000% | 390x995 / 390x995 |
| section-390-11 | 12168 | 4.127% | 390x756 / 390x756 |
| section-390-12 | 2808 | 2.022% | 390x356 / 390x356 |

## First Geometry Differences

```json
[
  {
    "width": 390,
    "identity": "section8.modules[6] et_pb_module et_pb_social_media_follow et_pb_social_media_follow_0 clearfix  et_pb_text_align_left et_pb_bg_layout_dark",
    "property": "width",
    "expected": 210,
    "actual": 196,
    "delta": -14
  }
]
```

All content, typography, geometry and pixel details are in the matching comparison JSON. Differences are reported, not automatically corrected.