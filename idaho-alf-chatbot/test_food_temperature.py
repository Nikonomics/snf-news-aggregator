"""
Test script for food temperature question to verify all citations are used.
"""

import requests
import json
import re

# Backend URL
BACKEND_URL = "https://alf-chatbot.onrender.com"

def test_food_temperature_question():
    """Test that responses include ALL inline citations for food temperature question."""
    
    print("="*80)
    print("TESTING FOOD TEMPERATURE QUESTION")
    print("="*80 + "\n")
    
    # Test question from user
    test_question = "tell me about food temperatures"
    
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
    usage = data.get("usage", {})
    
    print("="*80)
    print("RESPONSE")
    print("="*80)
    print(response_text)
    print("\n")
    
    # Check for inline citations
    inline_citations = re.findall(r'\[(\d+)\]', response_text)
    unique_citations = set(int(c) for c in inline_citations)
    expected_citations = set(range(1, len(retrieved_chunks) + 1))
    missing_citations = expected_citations - unique_citations
    
    print("="*80)
    print("TEST RESULTS")
    print("="*80)
    
    # Test 1: Check if inline citations exist
    if inline_citations:
        print(f"✅ PASS: Found {len(inline_citations)} inline citations in response")
        print(f"   Citations found: {sorted(unique_citations)}")
    else:
        print("❌ FAIL: No inline citations found in response")
    
    # Test 2: Check if ALL citations are used
    if missing_citations:
        print(f"\n❌ FAIL: Missing inline citations: {sorted(missing_citations)}")
        print(f"   Expected: {sorted(expected_citations)}")
        print(f"   Found: {sorted(unique_citations)}")
        print(f"   Missing: {sorted(missing_citations)}")
        print(f"\n   The AI should use ALL {len(retrieved_chunks)} citations inline!")
    else:
        print(f"\n✅ PASS: All {len(retrieved_chunks)} citations are used inline in the response")
    
    # Test 3: Show usage stats
    print(f"\n✅ PASS: Retrieved {len(retrieved_chunks)} chunks")
    print(f"✅ PASS: Found {len(citations)} citations")
    if usage.get('citations_used'):
        print(f"✅ PASS: Used {usage['citations_used']} citations")
        print(f"✅ PASS: Expected {usage['citations_expected']} citations")
        if usage.get('missing_citations'):
            print(f"❌ FAIL: Missing citations: {usage['missing_citations']}")
    
    # Test 4: Show citations
    print("\n" + "="*80)
    print("CITATIONS PROVIDED")
    print("="*80)
    for i, citation in enumerate(citations, 1):
        used_marker = "✅" if i in unique_citations else "❌"
        print(f"{used_marker} [{i}] {citation['citation']}")
        print(f"    {citation['section_title']}")
    
    # Test 5: Show which citations are used and which are missing
    print("\n" + "="*80)
    print("CITATION USAGE ANALYSIS")
    print("="*80)
    print(f"Total citations provided: {len(citations)}")
    print(f"Citations used inline: {len(unique_citations)}")
    print(f"Citations missing: {len(missing_citations)}")
    
    if missing_citations:
        print(f"\nMissing citations: {sorted(missing_citations)}")
        print("\nThese regulations were retrieved but not cited inline in the response:")
        for num in sorted(missing_citations):
            citation = citations[num - 1]
            print(f"  [{num}] {citation['citation']} - {citation['section_title']}")
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    if not missing_citations:
        print("✅ SUCCESS: All citations are used inline in the response!")
        print(f"   - Found {len(inline_citations)} inline citations")
        print(f"   - All {len(retrieved_chunks)} citations are used")
        print(f"   - Citations are properly numbered")
    else:
        print("⚠️  PARTIAL SUCCESS: Some citations are missing from the response")
        print(f"   - Found {len(inline_citations)} inline citations")
        print(f"   - Only {len(unique_citations)} of {len(retrieved_chunks)} citations used")
        print(f"   - Missing {len(missing_citations)} citations: {sorted(missing_citations)}")
        print(f"\n   The AI model needs to be prompted more strongly to use ALL citations.")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    try:
        test_food_temperature_question()
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

