@@ -19,7 +19,8 @@
             z: 0,
             price: 50,
             available: true,
-            type: "commercial"
+            type: "commercial",
+            requirements: ["assistant", "researcher"] // Example: Needs an assistant and a researcher
         },
         {
             id: 2,
@@ -61,7 +62,8 @@
             z: 0,
             price: 45,
             available: true,
-            type: "commercial"
+            type: "commercial",
+            requirements: ["creator", "humanoid"] // Example: Needs a creator and a humanoid
         },
         {
             id: 7,
@@ -72,7 +74,8 @@
             z: 0,
             price: 42,
             available: true,
-            type: "commercial"
+            type: "commercial",
+            requirements: ["researcher", "assistant"] // Example: Needs a researcher and an assistant
         }
     ]
 };

