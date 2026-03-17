from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),

    # React root
    path("", TemplateView.as_view(template_name="index.html")),

    # React fallback ONLY for non-api, non-admin routes
    re_path(r"^(?!admin|api).*$", TemplateView.as_view(template_name="index.html")),
]