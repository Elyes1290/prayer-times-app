package com.drogbinho.prayertimesapp2;

public class DhikrWidgetItem {
    private String text;
    private boolean isSubtitle;

    public DhikrWidgetItem(String text, boolean isSubtitle) {
        this.text = text;
        this.isSubtitle = isSubtitle;
    }

    public String getText() {
        return text;
    }

    public boolean isSubtitle() {
        return isSubtitle;
    }
}