package com.minimart.controller;

import com.minimart.domain.Product;
import com.minimart.repo.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductRepository repo;

    @GetMapping
    public Object list(@RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "20") int size) {
        return repo.findByIsActiveTrueAndIsApprovedTrue(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public Product get(@PathVariable UUID id) {
        return repo.findById(id).orElseThrow();
    }
}
