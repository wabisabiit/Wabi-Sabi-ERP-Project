# products/pagination.py
from rest_framework.pagination import PageNumberPagination

class ProductPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = "page_size"  # allow override, but we'll use 500
    max_page_size = 500