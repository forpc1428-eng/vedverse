package com.vedant.vedverse;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VedUpiPlugin.class);
        registerPlugin(VedScanPlugin.class);
        registerPlugin(VedExtrasPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
