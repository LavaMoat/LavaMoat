# Snapshot report for `test/generatePolicy.spec.js`

The actual snapshot is saved in `generatePolicy.spec.js.snap`.

Generated by [AVA](https://avajs.dev).

## generatePolicy - policy for a large file tree is ordered

> Snapshot 1

    `{␊
      "resources": {␊
        "test>c11>cc1>a11": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>c11>cc1>ccc>aa1": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>b11>bb1>aaa": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>b11": {␊
          "packages": {␊
            "test>b11>bb1": true,␊
            "x": true␊
          }␊
        },␊
        "test>b11>bb1": {␊
          "packages": {␊
            "test>b11>bb1>aaa": true,␊
            "test>b11>bb1>bbb": true␊
          }␊
        },␊
        "test>b11>bb1>bbb": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>c11": {␊
          "packages": {␊
            "test>c11>cc1": true␊
          }␊
        },␊
        "test>c11>cc1": {␊
          "packages": {␊
            "test>c11>cc1>a11": true,␊
            "test>c11>cc1>ccc": true␊
          }␊
        },␊
        "test>c11>cc1>ccc": {␊
          "packages": {␊
            "test>c11>cc1>ccc>aa1": true,␊
            "x": true␊
          }␊
        },␊
        "test": {␊
          "packages": {␊
            "test>b11": true,␊
            "test>c11": true␊
          }␊
        }␊
      }␊
    }`

## generatePolicy - policy for a large file tree

> Snapshot 1

    `{␊
      "resources": {␊
        "test>c11>cc1>a11": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>c11>cc1>ccc>aa1": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>b11>bb1>aaa": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>b11": {␊
          "packages": {␊
            "test>b11>bb1": true,␊
            "x": true␊
          }␊
        },␊
        "test>b11>bb1": {␊
          "packages": {␊
            "test>b11>bb1>aaa": true,␊
            "test>b11>bb1>bbb": true␊
          }␊
        },␊
        "test>b11>bb1>bbb": {␊
          "packages": {␊
            "x": true␊
          }␊
        },␊
        "test>c11": {␊
          "packages": {␊
            "test>c11>cc1": true␊
          }␊
        },␊
        "test>c11>cc1": {␊
          "packages": {␊
            "test>c11>cc1>a11": true,␊
            "test>c11>cc1>ccc": true␊
          }␊
        },␊
        "test>c11>cc1>ccc": {␊
          "packages": {␊
            "test>c11>cc1>ccc>aa1": true,␊
            "x": true␊
          }␊
        },␊
        "test": {␊
          "packages": {␊
            "test>b11": true,␊
            "test>c11": true␊
          }␊
        }␊
      }␊
    }`