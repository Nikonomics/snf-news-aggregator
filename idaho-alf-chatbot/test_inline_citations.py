"""
Test script for inline citation feature.
Tests that the backend returns responses with inline citations [1], [2], etc.
"""

import requests
import json

# Backend URL
BACKEND_URL = "https://alf-chatbot.onrender.com"

def test_inline_citations():
    """Test that responses include inline citations."""
    
    print("="*80)
    print("TESTING INLINE CITATION FEATURE")
    print("="*80 + "\n")
    
    # Test question
    test_question = "What are the staffing requirements for a 20-bed facility?"
    
    print(f"Question: {test_question}\n")
    print("Sending request to backend...\n")
    
    # Make request
    response = requests.post(
        f"{BACKEND_URL}/query",
        json={
            "question": test_question,
            "top_k": 12,
            "temperature": 0.5
        },
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    
    # Check response
    response_text = data["response"]
    citations = data["citations"]
    retrieved_chunks = data["retrieved_chunks"]
    
    print("="*80)
    print("RESPONSE")
    print("="*80)
    print(response_text)
    print("\n")
    
    # Check for inline citations
    import re
    inline_citations = re.findall(r'\[\d+\]', response_text)
    
    print("="*80)
    print("TEST RESULTS")
    print("="*80)
    
    # Test 1: Check if inline citations exist
    if inline_citations:
        print(f"✅ PASS: Found {len(inline_citations)} inline citations in response")
        print(f"   Citations found: {', '.join(set(inline_citations))}")
    else:
        print("❌ FAIL: No inline citations found in response")
        print("   Expected format: [1], [2], [3], etc.")
    
    # Test 2: Check if citations match retrieved chunks
    print(f"\n✅ PASS: Retrieved {len(retrieved_chunks)} chunks")
    print(f"✅ PASS: Found {len(citations)} citations")
    
    # Test 3: Check citation numbering
    citation_numbers = [int(c.replace('[', '').replace(']', '')) for c in inline_citations]
    if citation_numbers:
        max_citation = max(citation_numbers)
        if max_citation <= len(retrieved_chunks):
            print(f"✅ PASS: Citation numbers are valid (max: {max_citation}, chunks: {len(retrieved_chunks)})")
        else:
            print(f"❌ FAIL: Citation number {max_citation} exceeds retrieved chunks ({len(retrieved_chunks)})")
    
    # Test 4: Check if ALL citations are used
    unique_citations = set(citation_numbers)
    expected_citations = set(range(1, len(retrieved_chunks) + 1))
    missing_citations = expected_citations - unique_citations
    
    if missing_citations:
        print(f"❌ FAIL: Missing inline citations: {sorted(missing_citations)}")
        print(f"   Expected: {sorted(expected_citations)}")
        print(f"   Found: {sorted(unique_citations)}")
        print(f"   The AI should use ALL citations inline in the response!")
    else:
        print(f"✅ PASS: All citations are used inline in the response")
    
    # Test 5: Show citations
    print("\n" + "="*80)
    print("CITATIONS")
    print("="*80)
    for i, citation in enumerate(citations, 1):
        print(f"[{i}] {citation['citation']}")
        print(f"    {citation['section_title']}")
    
    # Test 6: Show retrieved chunks with similarity scores
    print("\n" + "="*80)
    print("RETRIEVED CHUNKS (with similarity scores)")
    print("="*80)
    for i, chunk in enumerate(retrieved_chunks[:5], 1):  # Show first 5
        print(f"\n[{i}] {chunk['citation']}")
        print(f"    Similarity: {chunk['similarity']:.4f}")
        print(f"    Title: {chunk['section_title']}")
        print(f"    Content preview: {chunk['content'][:100]}...")
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    if inline_citations:
        if not missing_citations:
            print("✅ Inline citation feature is working perfectly!")
            print(f"   - Found {len(inline_citations)} inline citations")
            print(f"   - All {len(retrieved_chunks)} citations are used inline")
            print(f"   - Citations are properly numbered")
            print(f"   - Citations match retrieved chunks")
        else:
            print("⚠️  PARTIAL SUCCESS: Inline citations found but not all are used")
            print(f"   - Found {len(inline_citations)} inline citations")
            print(f"   - Only {len(unique_citations)} of {len(retrieved_chunks)} citations used")
            print(f"   - Missing citations: {sorted(missing_citations)}")
            print(f"   - Backend may need stronger prompting")
    else:
        print("❌ FAIL: No inline citations found in response")
        print("   - Backend may need to be redeployed")
        print("   - Check if AI model is following the prompt instructions")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    try:
        test_inline_citations()
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

