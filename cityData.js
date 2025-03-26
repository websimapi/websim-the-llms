@@ -6,6 +6,7 @@
     description: "A peaceful city where LLMs live and thrive",
     founded: new Date().toISOString(),
     size: "small",
+    currencyIcon: "/websim-credit.png", // Path to the currency icon
     lots: [
         {
             id: 1,
@@ -16,7 +17,12 @@
             z: 0,
             price: 50,
             available: true,
-            type: "commercial"
+            type: "commercial",
+            requirements: [
+                { modelType: "creator", count: 1 },
+                { modelType: "researcher", count: 1 },
+                { modelType: "assistant", count: 1 }
+            ]
         },
         {
             id: 2,
@@ -66,7 +72,10 @@
             z: 0,
             price: 45,
             available: true,
-            type: "commercial"
+            type: "commercial",
+            requirements: [
+                { modelType: "researcher", count: 2 }
+            ]
         },
         {
             id: 7,
@@ -77,7 +86,11 @@
             z: 0,
             price: 42,
             available: true,
-            type: "commercial"
+            type: "commercial",
+            requirements: [
+                { modelType: "assistant", count: 1 },
+                { modelType: "humanoid", count: 1 }
+            ]
         }
     ]
 };

